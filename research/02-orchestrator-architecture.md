# Orchestrator Architecture Research

> Date: 2026-02-13 | Status: Research Complete

## What the Orchestrator Does (NOT the Agent)

The orchestrator is the **control plane** — it doesn't do the AI work itself. It:
- **Schedules** agent runs (cron, one-shot, event-driven triggers)
- **Heartbeats** — polls agents periodically to check health/progress
- **Task queue** — assigns work, tracks status, handles retries
- **Spawns agents** — spins up stateless compute instances to execute tasks
- **Dashboard** — real-time visibility into all agent states

---

## Option 1: Convex as Sole Orchestrator ⭐ RECOMMENDED FOR MVP

We already use Convex (`prod:calm-robin-588`). It has everything needed:

### Capabilities
| Feature | Convex Support |
|---------|---------------|
| Scheduled functions | ✅ `ctx.scheduler.runAfter()` / `ctx.scheduler.runAt()` — durable, stored in DB |
| Cron jobs | ✅ `cronJobs()` — interval, monthly, cron syntax |
| Real-time subscriptions | ✅ Built-in reactivity for dashboard |
| Task queue | ✅ Model as a table: `tasks` with status field, mutations to claim/complete |
| Retries | ✅ Schedule retry via `runAfter()` on failure |
| Event-driven | ✅ Mutations trigger scheduled functions atomically |

### Limits (from docs)
- **1,000 scheduled functions per mutation** (with 8MB total args)
- **Function calls**: 1M/month free, 25M/month on Pro ($2/additional 1M)
- **Action execution**: 20 GiB-hours free (512 MiB RAM for Node.js runtime)
- **Action timeout**: 10 minutes (actions), 1 second for queries/mutations
- **Tables**: 10,000 per deployment
- **Document size**: 1 MiB max

### Task Queue Pattern in Convex
```typescript
// Schema: tasks table
// { agentId, type, status: "pending"|"running"|"completed"|"failed", 
//   payload, result, retries, scheduledAt, startedAt, completedAt }

// Claim a task (mutation - atomic)
export const claimTask = mutation(async (ctx) => {
  const task = await ctx.db.query("tasks")
    .withIndex("by_status", q => q.eq("status", "pending"))
    .first();
  if (!task) return null;
  await ctx.db.patch(task._id, { status: "running", startedAt: Date.now() });
  // Schedule the actual execution (action for external compute)
  await ctx.scheduler.runAfter(0, internal.executor.run, { taskId: task._id });
  return task._id;
});
```

### Heartbeat Pattern
```typescript
// crons.ts
crons.interval("agent-heartbeat", { minutes: 5 }, internal.heartbeat.checkAgents);

// heartbeat.ts - check all running agents, mark stale ones as failed
export const checkAgents = internalMutation(async (ctx) => {
  const running = await ctx.db.query("agentRuns")
    .withIndex("by_status", q => q.eq("status", "running"))
    .collect();
  for (const run of running) {
    if (Date.now() - run.lastHeartbeat > 300000) { // 5 min stale
      await ctx.db.patch(run._id, { status: "failed", error: "heartbeat timeout" });
      // Schedule retry
      await ctx.scheduler.runAfter(0, internal.orchestrator.retryRun, { runId: run._id });
    }
  }
});
```

### Verdict
**Convex CAN be the sole orchestrator.** Use it for scheduling, task queue, heartbeats, and real-time dashboard. The only thing it can't do is run long-lived AI agent code (10-min action timeout). Solution: **Convex orchestrates, external compute executes.**

---

## Option 2: Inngest — Event-Driven Orchestration

### How It Works
- You define **functions** that respond to **events**
- Functions have built-in **steps** (durable execution — each step is checkpointed)
- Steps can sleep, wait for events, retry, fan-out
- You send events via API; Inngest routes them to functions
- Runs on their infra (or self-hosted)

### Key Features
- Durable execution with automatic retries
- Concurrency controls built-in
- Event batching
- Cron scheduling
- Real-time connections for monitoring

### Pricing
| Plan | Price | Executions | Concurrency |
|------|-------|-----------|-------------|
| Hobby | $0/mo | 50K/mo | 5 concurrent steps |
| Pro | $75/mo | 1M/mo (then $50/1M) | 100 (then $25/25) |
| Enterprise | Custom | Custom | 500-50K |

### Pros
- Great DX, TypeScript-first
- Built-in step functions = natural for multi-step agent workflows
- Handles retries, timeouts, concurrency without custom code

### Cons
- Another vendor dependency on top of Convex
- 50K free executions could be tight with many agents
- Adds latency (event → Inngest → your compute)
- **Doesn't provide compute** — still need somewhere to run agent code

### Verdict
Good product, but **redundant if we use Convex** for orchestration. Inngest shines when you DON'T have a real-time database with built-in scheduling. We do.

---

## Option 3: Trigger.dev — Background Job Orchestration

### How It Works
- Define **tasks** in `/trigger` folders in your codebase
- Code is bundled and deployed to Trigger.dev's infrastructure
- Tasks can run indefinitely (no timeout)
- Built-in retries, concurrency, scheduling
- **They provide the compute** — your code runs on their servers

### Pricing
- Compute: per-second pricing based on machine size (e.g., small-1x: $0.0000338/s)
- Per run: $0.000025 invocation cost
- Example: 10s task, 100 runs/day = ~$1.09/month
- Free tier available, self-hosting option (open source)

### Key Differentiator
Unlike Inngest, **Trigger.dev provides the compute**. Your task code runs on their machines with no timeout. This is interesting for agent execution specifically.

### Pros
- **Solves the compute problem** — runs your code, no infra to manage
- No timeouts
- Open source, self-hostable
- Good for long-running AI agent tasks

### Cons
- Your agent code must run in their environment
- Concurrency limits (200 on Pro, need to buy more)
- Rate limits: 60 req/min free, 1,500 req/min paid
- Another vendor for compute + orchestration

### Verdict
**Interesting as the EXECUTION layer** (not orchestrator). Convex orchestrates → Trigger.dev executes the actual agent runs. Worth considering if we don't want to manage our own compute.

---

## Option 4: Temporal.io — Workflow Orchestration

### How It Works
- Define **workflows** and **activities** in code
- Workflows are deterministic, replayable state machines
- Activities are the actual work (can call external APIs, etc.)
- Temporal server manages workflow state, retries, timeouts
- Workers pull tasks from Temporal server

### Pricing (Temporal Cloud)
| Plan | Price | Included |
|------|-------|----------|
| Essentials | $100/mo | 1M actions, 1GB active storage |
| Business | $500/mo | 2.5M actions, 2.5GB active storage |
| Enterprise | Custom | 10M+ actions |
- $1,000 free credits to start

### Pros
- Most powerful workflow orchestration available
- Battle-tested at massive scale (Uber, Netflix, Stripe)
- Durable execution with full replay
- Language-agnostic (Go, Java, TypeScript, Python, .NET)

### Cons
- **Massive overkill for MVP** — complex concepts (workflows, activities, workers, task queues, signals, queries)
- Steep learning curve
- $100/mo minimum on cloud
- Self-hosting requires running Temporal server + dependencies (Cassandra/PostgreSQL, Elasticsearch)
- Designed for microservices at scale, not indie MVP

### Verdict
**Skip for MVP.** Revisit if autofound.ai reaches enterprise scale with 1000s of concurrent agent workflows. For now, Convex does everything we need.

---

## Option 5: BullMQ + Redis — Simple Task Queue

### How It Works
- BullMQ is a Node.js library for job queues backed by Redis
- You push jobs to named queues, workers pull and process them
- Built-in: retries, delays, priorities, rate limiting, repeatable jobs (cron)

### Pricing
- **Free** (open source) — you just need Redis
- Redis: $0 (self-hosted) or ~$5-30/mo (Upstash, Redis Cloud)

### Pros
- Dead simple, well-understood pattern
- Very fast (Redis)
- Full control, no vendor lock-in
- Great for MVP

### Cons
- **Self-hosted** — need to run Redis and workers somewhere
- No built-in dashboard (need Bull Board or similar)
- No real-time subscriptions (need to bolt on)
- Doesn't integrate with Convex — now you have two sources of truth
- Need to sync state between BullMQ and Convex DB

### Verdict
**Unnecessary complexity.** We'd need Redis + workers + state sync with Convex. Convex already does task queues natively. Only consider if Convex scheduling hits hard limits.

---

## Option 6: Cloudflare Durable Objects — Per-Agent State

### How It Works
- Each Durable Object (DO) is a persistent, stateful JavaScript object
- Has its own storage (key-value, SQL) and a single-threaded execution model
- **Alarms**: schedule the DO to wake up at a future time (at-least-once execution)
- Only ONE alarm per DO at a time (but can manage multiple events in storage)
- Automatic retry with exponential backoff on failure

### Agent-as-Durable-Object Pattern
```typescript
export class AgentBrain extends DurableObject {
  async scheduleEvent(id, runAt, repeatMs = null) {
    await this.ctx.storage.put(`event:${id}`, { id, runAt, repeatMs });
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm || runAt < currentAlarm) {
      await this.ctx.storage.setAlarm(runAt);
    }
  }
  
  async alarm() {
    // Process due events, reschedule for next one
    // Each agent DO manages its own schedule
  }
}
```

### Pricing
- $0.15/million requests
- Storage: $0.20/GB-month
- Alarms: included in request pricing

### Pros
- **Per-agent isolation** — each agent has its own persistent state machine
- Natural fit for "agent brain" concept
- Global distribution (runs at edge)
- Very low cost at scale

### Cons
- **Separate from Convex** — state split between DO storage and Convex DB
- One alarm per DO (workaround: manage event queue in storage)
- Limited compute time per request (128MB memory, CPU limits)
- Not great for long-running tasks (30s wall time for alarms)
- Dashboard/monitoring would need custom building
- Cloudflare ecosystem lock-in

### Verdict
**Architecturally interesting but wrong for our stack.** We'd be splitting state between Convex (user data, dashboard) and Durable Objects (agent state). Convex already provides the persistence + scheduling we need. DOs add complexity without clear benefit for MVP.

---

## Recommendation: Convex-First Architecture

### The Architecture

```
┌─────────────────────────────────────────────────┐
│                    CONVEX                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Task     │  │ Cron     │  │ Real-time     │  │
│  │ Queue    │  │ Scheduler│  │ Dashboard     │  │
│  │ (table)  │  │ (built-in│  │ (subscriptions│  │
│  │          │  │  crons)  │  │  + queries)   │  │
│  └────┬─────┘  └────┬─────┘  └───────────────┘  │
│       │              │                            │
│  ┌────▼──────────────▼─────┐                     │
│  │   Orchestrator Logic     │                     │
│  │  (mutations + actions)   │                     │
│  │  - Claim tasks           │                     │
│  │  - Schedule retries      │                     │
│  │  - Track heartbeats      │                     │
│  └────────────┬─────────────┘                     │
└───────────────┼───────────────────────────────────┘
                │ HTTP call / spawn
                ▼
┌───────────────────────────────────┐
│     EXTERNAL COMPUTE              │
│  (where agents actually run)      │
│                                   │
│  Options:                         │
│  • Trigger.dev (managed, no timeout)  │
│  • Modal.com (serverless Python)  │
│  • Fly.io (containers)            │
│  • Railway (containers)           │
│  • AWS Lambda (15-min timeout)    │
│  • Self-hosted VPS                │
│                                   │
│  Agent calls back to Convex:      │
│  - Report progress (heartbeat)    │
│  - Store results                  │
│  - Trigger next steps             │
└───────────────────────────────────┘
```

### Why This Works

1. **Single source of truth** — All state lives in Convex (tasks, agents, results, schedules)
2. **Real-time dashboard for free** — Convex subscriptions update UI instantly
3. **No new infra** — We already have Convex deployed
4. **Atomic scheduling** — Schedule + state update in same mutation (transactional)
5. **Simple retry logic** — `scheduler.runAfter(backoff, retryFn, args)`
6. **Flexible compute** — Agent execution is just an HTTP endpoint; swap providers freely

### Key Limits to Watch
- **Action timeout**: 10 minutes — agent execution MUST be external for long tasks
- **1M function calls/month free** — sufficient for MVP (hundreds of agents)
- **1,000 scheduled functions per mutation** — not a practical bottleneck
- **No native priority queues** — implement with indexes on priority field

### MVP Implementation Plan
1. `tasks` table in Convex (status, priority, agentId, payload, result, retries)
2. `agentRuns` table (agentId, status, heartbeat timestamps, logs)
3. `schedules` table (agentId, cron expression, next run time, enabled)
4. Convex cron job every 1-5 min: check schedules, create tasks, check heartbeats
5. Convex action: HTTP call to external compute to execute agent task
6. External compute: calls Convex mutation to report progress/results
7. Dashboard: Convex queries with real-time subscriptions

### When to Reconsider
- **>10,000 concurrent agents** — may need dedicated queue (BullMQ/Temporal)
- **Complex workflow DAGs** — Temporal becomes worth the complexity
- **Sub-second scheduling precision** — Convex crons are minute-granularity minimum
- **Cost at scale** — function calls add up; evaluate at 10M+/month

---

## Comparison Matrix

| Criteria | Convex | Inngest | Trigger.dev | Temporal | BullMQ | CF Durable Objects |
|----------|--------|---------|-------------|----------|--------|-------------------|
| Already in stack | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Scheduling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (alarms) |
| Task queue | ✅ (table) | ✅ | ✅ | ✅ | ✅ | ⚠️ (manual) |
| Real-time dashboard | ✅ (native) | ⚠️ (their UI) | ⚠️ (their UI) | ⚠️ (their UI) | ❌ | ❌ |
| Provides compute | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ (limited) |
| Retries | ✅ (manual) | ✅ (built-in) | ✅ (built-in) | ✅ (built-in) | ✅ (built-in) | ✅ (auto) |
| MVP complexity | Low | Medium | Medium | High | Medium | Medium |
| Monthly cost (MVP) | $0 | $0-75 | ~$5-20 | $100+ | $5-30 (Redis) | ~$1 |
| Self-hostable | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |

## TL;DR

**Use Convex as the orchestrator. Use external compute (Trigger.dev or Fly.io) for agent execution only.** This gives us scheduling, task queue, heartbeats, retries, and real-time dashboard with zero additional infrastructure. Revisit only when we hit scale limits.
