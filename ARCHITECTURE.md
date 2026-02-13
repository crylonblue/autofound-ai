# autofound.ai — Architecture Blueprint

> Last updated: 2026-02-13 | Status: Ready to build

---

## 1. Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   User       │     │  Next.js Frontend (Vercel)           │
│   Browser    │────▶│  + Clerk Auth                        │
└──────────────┘     └──────────────┬───────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────────────┐
                     │         CONVEX (Orchestrator)         │
                     │  • Structured data (users, orgs,     │
                     │    agents, tasks, sessions)           │
                     │  • Task queue + scheduling            │
                     │  • Real-time subscriptions → UI       │
                     │  • Encrypted BYOK keys (DEKs)        │
                     └──────┬───────────────┬───────────────┘
                            │               │
               ┌────────────▼──┐    ┌───────▼────────────┐
               │ CF Workers    │    │ Fly.io Machines     │
               │ (simple tasks)│    │ (complex tasks,     │
               │ ~0ms cold     │    │  code execution)    │
               │ start         │    │  ~300ms cold start  │
               └──┬────┬───┬──┘    └──┬────┬───┬────────┘
                  │    │   │          │    │   │
          ┌───────▼┐ ┌▼───▼──┐  ┌────▼┐ ┌▼───▼──┐
          │  R2    │ │ LLM   │  │ R2  │ │ LLM   │
          │ (files)│ │ APIs  │  │     │ │ APIs  │
          │        │ │(BYOK) │  │     │ │(BYOK) │
          └────────┘ └───────┘  └─────┘ └───────┘

  KV ← hot cache (agent status, heartbeats, rate limits)
```

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js + Clerk | Already built. Clerk handles auth, orgs, RBAC |
| **Orchestrator** | Convex | Already deployed (`prod:calm-robin-588`). Built-in scheduling, task queues via tables, real-time subscriptions power the dashboard. Single source of truth |
| **Agent Runtime (simple)** | Cloudflare Workers | ~0ms cold start, wall-clock time is free (only CPU counts), native R2 access. $5/mo for millions of runs |
| **Agent Runtime (complex)** | Fly.io Machines | Full Linux VM, any language/binary, ~300ms cold start, pay-per-second. For code execution, shell tools |
| **Structured Data** | Convex | Users, orgs, agents, tasks, sessions, permissions, billing |
| **File/Blob Storage** | Cloudflare R2 | Agent memory, conversation history, workspace files, documents. Zero egress. 10GB free |
| **Hot Cache** | Cloudflare KV | Agent status, heartbeats, session tokens, feature flags. ~25ms global reads |
| **Auth** | Clerk | SSO, orgs, RBAC — integrated with Next.js and Convex |
| **BYOK Encryption** | Envelope encryption | Master key in Worker env → per-org DEKs in Convex → encrypted API keys in Convex |
| **Code Execution** | E2B (Phase 2) | Ephemeral sandboxes, ~500ms cold start, full Python/Node/shell |

---

## 3. Data Flow

**User creates a task → agent executes → results appear in real-time:**

```
1. User clicks "Run task" in dashboard
       │
2. Next.js calls Convex mutation: createTask()
       │  → inserts task row (status: "pending")
       │  → ctx.scheduler.runAfter(0, internal.executor.dispatch, { taskId })
       │
3. Convex action (executor.dispatch):
       │  → reads agent config + encrypted API key from Convex
       │  → decrypts API key (master key → DEK → plaintext)
       │  → HTTP POST to CF Worker with { taskId, agentId, orgId, apiKey }
       │
4. CF Worker boots (~0ms):
       │  → pulls context from R2: SOUL.md, MEMORY.md, recent history
       │  → builds system prompt (persona + tools + context)
       │
5. Agent loop:
       │  → calls LLM API with user's API key
       │  → LLM returns tool calls → Worker executes tools
       │  → tool results fed back to LLM
       │  → repeat until LLM produces final answer
       │  (wall-clock time waiting on LLM is free on CF Workers)
       │
6. Worker writes results:
       │  → R2: updated MEMORY.md, workspace files, artifacts
       │  → Convex mutation: task.complete({ result, messages })
       │
7. Worker dies (stateless, ephemeral)
       │
8. Convex subscription fires → UI updates in real-time
       └── Dashboard shows: task complete ✅ + results
```

---

## 4. State Management

### Split by Store

```
┌──────────────────┬──────────────────┬───────────────────┐
│     CONVEX       │       R2         │       KV          │
│  (Source of      │   (Blob Store)   │   (Hot Cache)     │
│   Truth)         │                  │                   │
├──────────────────┼──────────────────┼───────────────────┤
│ Users & orgs     │ SOUL.md          │ agent:status      │
│ Agent configs    │ MEMORY.md        │ agent:heartbeat   │
│ Tasks & results  │ Daily memory     │ agent:currentTask │
│ Sessions/history │ Workspace files  │ session:tokens    │
│ Encrypted keys   │ Uploaded docs    │ rate:limits       │
│ Permissions      │ Tool outputs     │ cache:responses   │
│ Billing/usage    │ Exports/reports  │ feature:flags     │
│ Org chart        │ Conv. history    │                   │
│                  │   (JSONL)        │                   │
└──────────────────┴──────────────────┴───────────────────┘
```

### R2 Directory Structure

```
/{orgId}/
  agents/{agentId}/
    memory/
      MEMORY.md                     # Curated long-term memory
      daily/2026-02-13.md           # Daily log
    workspace/{taskId}/
      output.json
      screenshots/
    history/{sessionId}.jsonl       # Conversation logs
    identity/
      SOUL.md                       # Agent persona
      config.json
  shared/
    documents/{docId}               # Org-wide uploads
    knowledge/{kbId}/               # Shared knowledge bases
  exports/{exportId}.zip
```

### When to Use What

| Need | Store | Why |
|------|-------|-----|
| Query tasks by status | Convex | Indexed queries, real-time subscriptions |
| Load agent persona | R2 | Unstructured markdown, loaded at boot |
| Check if agent is online | KV | 25ms reads, globally distributed |
| Store task result JSON | Convex | Structured, queryable, powers dashboard |
| Store generated PDF | R2 | Large blob, zero egress on download |
| Rate limit an org | KV | Fast reads, eventual consistency OK |

---

## 5. Agent Design

### Tool Loop

```
┌─────────────────────────────────┐
│  1. Load context (R2 + Convex)  │
│  2. Build system prompt         │
│  3. Call LLM                    │──────┐
│  4. Parse response              │      │
│     ├─ text → return result     │      │
│     └─ tool_call → execute tool │      │
│        → feed result back ──────┼──────┘
│  5. Write results               │
│  6. Die                         │
└─────────────────────────────────┘
```

### 3-Tier Context Loading

| Tier | Content | Tokens | When |
|------|---------|--------|------|
| **1 — Always** | SOUL.md + org context + tool definitions | ~2-4K | Every run |
| **2 — Recent** | Last N messages + compaction summary + active task | ~4-20K | Every run |
| **3 — On-Demand** | Semantic memory search + relevant files + related task outcomes | ~1-4K | When query warrants |

### Core Tools (MVP)

| Tool | Backend | Scope |
|------|---------|-------|
| `file_read` / `file_write` | R2 API | `/{orgId}/agents/{agentId}/` |
| `web_search` | Tavily API | Platform key |
| `web_fetch` | `fetch()` in Worker | Returns markdown |
| `agent_message` | Convex mutation | Post to another agent's queue |
| `memory_write` | R2 API | Append daily log or update MEMORY.md |

### Multi-Agent Communication

Agents communicate via **Convex task queue** (not direct connections):

```
CEO Agent → createTask(to: "research-agent", message: "Research competitor X")
  → Convex stores task (pending)
  → Scheduler triggers research-agent Worker
  → Research Agent runs, writes result
  → CEO Agent picks up result on next run (or triggered via subscription)
```

**Org chart enforcement:** Each agent has `parentAgentId` + `subordinateAgentIds`. Agents can only message direct reports and parent.

**Safety guards:**
- Max delegation depth: 5 levels
- Task deduplication (content hash + time window)
- Per-agent rate limits
- Circuit breaker: N consecutive failures → stop delegating

---

## 6. Scaling & Cost Estimates

### Compute (CF Workers — agent execution)

| Scale | Runs/month | CPU-ms/run | Monthly Cost |
|-------|-----------|-----------|-------------|
| 10 agents | ~3,000 | 50ms | **~$5** (base plan) |
| 100 agents | ~100,000 | 50ms | **~$5.40** |
| 1,000 agents | ~1,500,000 | 50ms | **~$20** |

### Storage (R2 + KV)

| Scale | R2 Storage | R2 Ops | KV Ops | Monthly Cost |
|-------|-----------|--------|--------|-------------|
| 10 agents | ~500 MB | ~16K | ~7.5K | **$0** (free tier) |
| 100 agents | ~5 GB | ~258K | ~75K | **$0** (free tier) |
| 1,000 agents | ~100 GB | ~5.3M | ~750K | **~$14** |

### Orchestrator (Convex)

| Scale | Function Calls/mo | Cost |
|-------|------------------|------|
| 10 agents | ~50K | **$0** (free tier: 1M) |
| 100 agents | ~500K | **$0** (free tier) |
| 1,000 agents | ~5M | **~$25** (Pro plan) |

### Total Estimated Monthly Cost

| Scale | Compute | Storage | Orchestrator | **Total** |
|-------|---------|---------|-------------|-----------|
| **10 agents** | $5 | $0 | $0 | **~$5/mo** |
| **100 agents** | $5 | $0 | $0 | **~$5/mo** |
| **1,000 agents** | $20 | $14 | $25 | **~$59/mo** |

> Note: LLM API costs are paid by users (BYOK). These are platform infrastructure costs only.

---

## 7. MVP Scope — Phase 1 (2 Weeks)

### Week 1: Foundation

- [ ] **BYOK settings page** — user enters API keys (OpenAI, Anthropic, etc.), stored with envelope encryption in Convex
- [ ] **Agent CRUD** — create/edit agents with custom SOUL.md prompts, assign to org chart positions
- [ ] **Task creation UI** — simple form: pick agent, write instruction, submit
- [ ] **Convex schema** — `agents`, `tasks`, `apiKeys`, `agentSessions` tables

### Week 2: Execution

- [ ] **CF Worker agent runtime** — boots, loads context from R2, runs LLM loop, writes results
- [ ] **Task results display** — real-time via Convex subscriptions (pending → running → complete)
- [ ] **Basic org chart** — visual hierarchy, CEO can delegate tasks to subordinates
- [ ] **Agent-to-agent delegation** — agent can create sub-tasks for other agents via `agent_message` tool

### What's NOT in MVP

| Feature | Why Not | When |
|---------|---------|------|
| Code execution sandbox | Complexity (E2B integration) | Phase 2 |
| RAG / memory search | Needs embeddings pipeline | Phase 2 |
| Advanced scheduling (cron) | Manual triggers sufficient for MVP | Phase 2 |
| Fly.io runtime | CF Workers sufficient for simple tasks | Phase 2 |
| File upload / document processing | Scope creep | Phase 2 |
| Usage tracking / billing | Premature | Phase 3 |

---

## 8. Phase 2 Ideas

| Feature | Implementation | Value |
|---------|---------------|-------|
| **Code execution** | E2B sandboxes — ephemeral VMs, Python/Node/shell. Agent gets `code_execute` tool | Agents can write and run code, analyze data |
| **RAG memory search** | Cloudflare Vectorize or Convex vector search. Embed MEMORY.md chunks + daily logs. Inject top-K into context | Agents remember across sessions without loading everything |
| **Fly.io for complex tasks** | Spin up Fly Machine for tasks needing >128MB RAM, shell access, or long duration. Auto-stop after completion | Handles code execution, data processing, complex workflows |
| **Agent marketplace** | Pre-built agent templates (researcher, writer, analyst) with SOUL.md + tool configs. One-click deploy | Faster onboarding, community-driven |
| **Advanced scheduling** | Convex cron triggers — daily/weekly/monthly agent runs. UI for schedule management | Automated reporting, monitoring |
| **Streaming responses** | WebSocket or SSE from Worker → Convex → UI. Show agent thinking in real-time | Better UX for long-running tasks |
| **Audit log** | Log every LLM call, tool use, delegation in Convex. Exportable | Compliance, debugging, trust |

---

## Key Architectural Decisions

1. **Convex as single orchestrator** — no additional queue (BullMQ, Temporal, Inngest). Convex already has scheduling, tables-as-queues, and real-time. Revisit at 10K+ concurrent agents.

2. **CF Workers first, Fly.io second** — Workers handle 90% of agent tasks (LLM calls + simple tools). Fly.io only needed for code execution and heavy compute. Keeps costs minimal.

3. **R2 over S3** — zero egress fees matter when agents read files constantly. Native CF integration. Same free tier covers MVP through 100+ agents.

4. **Envelope encryption for BYOK** — master key in Worker env (never in DB), per-org DEKs in Convex. Simple to implement, proper security. Keys decrypted only in Worker memory, never persisted.

5. **Stateless agents** — no long-lived processes. Boot → work → die. All state in R2 + Convex. Scales infinitely, costs nothing when idle.

6. **Convex task queue for multi-agent** — agents don't talk directly. They post tasks to Convex, which triggers the target agent. Simple, debuggable, auditable.
