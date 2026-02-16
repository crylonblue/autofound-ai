# autofound.ai — Architecture Blueprint

> Last updated: 2026-02-17 | Status: Building toward launch

---

## 1. Vision

**autofound.ai = "Hire AI agents that are always on."**

Each agent is a persistent, always-on team member with:
- **Custom personality** — user defines the base prompt (SOUL.md)
- **Custom skills** — pick from skill marketplace or write your own
- **Always-on heartbeat** — agent checks in every 30 min, does proactive work
- **Chat interface** — talk to any agent directly, give instructions, ask questions
- **Reports back** — agent posts updates to dashboard when it does something
- **BYOK** — user brings their own API keys, we never touch their LLM costs

---

## 2. Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   User       │     │  Next.js Frontend (Vercel)           │
│   Browser    │────▶│  + Clerk Auth                        │
│              │◀────│  + Real-time Chat UI                 │
└──────────────┘     └──────────────┬───────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────────────┐
                     │         CONVEX (Orchestrator)         │
                     │  • Users, agents, tasks, messages     │
                     │  • Heartbeat scheduler (per agent)    │
                     │  • Chat message routing               │
                     │  • Real-time subscriptions → UI       │
                     │  • Encrypted BYOK keys (DEKs)        │
                     │  • Skill registry                     │
                     └──────┬───────────────┬───────────────┘
                            │               │
                    ┌───────▼──────┐ ┌──────▼─────────────┐
                    │ Cloudflare   │ │ Fly.io Machines     │
                    │  R2 (files)  │ │ (Agent Runtime)     │
                    │  KV (cache)  │ │  • Heartbeat runs   │
                    └──────────────┘ │  • Task execution   │
                                     │  • Chat responses   │
                                     └──────┬──────────────┘
                                            │
                                      ┌─────▼─────┐
                                      │ LLM APIs  │
                                      │ (BYOK)    │
                                      └───────────┘
```

---

## 3. Agent Lifecycle

### Hiring an Agent
```
User clicks "Hire Agent" → picks template or creates custom
  → sets name, role, base prompt, model, skills
  → Convex creates agent record
  → Convex creates heartbeat cron (every 30 min)
  → Agent is NOW ALIVE — first heartbeat fires immediately
```

### Heartbeat Loop (Every 30 min)
```
Convex cron fires for agent
  → Convex action: spin up Fly.io Machine
  → Machine boots (~300ms), loads:
     - SOUL.md (agent personality)
     - MEMORY.md (long-term memory)
     - Recent chat messages
     - Pending tasks
     - Skill definitions
  → Agent decides: work on tasks? proactive action? nothing to do?
  → Writes results back (Convex + R2)
  → Machine auto-stops
  → Dashboard updates in real-time
```

### Chat with Agent
```
User sends message in chat UI
  → Convex stores message in conversation
  → Convex action: spin up Fly.io Machine
  → Machine loads context + conversation history
  → Agent responds (streams back via Convex mutations)
  → UI shows response in real-time
  → Machine auto-stops
```

### Task Execution
```
User (or another agent) creates task
  → Convex stores task (pending)
  → Agent picks it up on next heartbeat OR immediately if chat-triggered
  → Fly.io Machine runs tool loop
  → Results written to Convex + R2
  → Task marked complete, dashboard updates
```

---

## 4. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 15 + Clerk | Already built. Auth, orgs, RBAC |
| **Orchestrator** | Convex (`calm-robin-588`) | Scheduling, real-time, task queues |
| **Agent Runtime** | Fly.io Machines | Full Linux container, pay-per-second, ~300ms cold start |
| **File Storage** | Cloudflare R2 | Agent memory, workspace files. Zero egress |
| **Hot Cache** | Cloudflare KV | Agent status, heartbeat state |
| **Auth** | Clerk | SSO, orgs, JWT verification with Convex |
| **BYOK Encryption** | AES-256-GCM envelope encryption | Master key in env → per-key encryption in Convex |

---

## 5. Data Model

### Convex Tables

```
users          — clerkId, email, name, onboardingDismissed
agents         — userId, name, role, icon, color, model, systemPrompt, status, skills[]
tasks          — userId, agentId, title, description, status, result, priority
agentRuns      — taskId, agentId, userId, status, flyMachineId, output, tokensUsed
messages       — agentId, userId, role (user|agent), content, timestamp
apiKeys        — userId, provider, encryptedKey, maskedKey
orgChart       — userId, connections[], nodePositions[]
skills         — name, description, toolDefinitions[], public/private
heartbeats     — agentId, lastRun, lastResult, nextRun
```

### R2 Structure

```
/{userId}/
  agents/{agentId}/
    SOUL.md                         # Agent personality (custom base prompt)
    MEMORY.md                       # Curated long-term memory
    memory/YYYY-MM-DD.md            # Daily logs
    workspace/                      # Agent's working files
  shared/
    documents/                      # Uploaded files agents can access
```

---

## 6. Skills System

Skills are modular tool packs an agent can be equipped with:

```json
{
  "name": "web-research",
  "description": "Search the web and extract content",
  "tools": [
    { "name": "web_search", "backend": "tavily" },
    { "name": "web_fetch", "backend": "fetch" }
  ]
}
```

**Built-in skills (MVP):**
- `web-research` — web_search + web_fetch
- `file-management` — read/write files in R2 workspace
- `shell` — execute commands in container
- `agent-comms` — message other agents, create sub-tasks

**Custom skills (user-defined):**
- User writes tool definitions + handler code
- Stored in Convex, loaded into agent's system prompt
- Future: skill marketplace where users share/sell skills

---

## 7. Chat Architecture

The chat is the primary interaction model — not a task form.

```
┌─────────────────────────────────────┐
│  Chat UI (per agent)                │
│  ┌─────────────────────────────┐    │
│  │ 🤖 Marketing Lead           │    │
│  │                             │    │
│  │ Agent: I checked our SEO    │    │
│  │ rankings and we dropped     │    │
│  │ for "AI tools". Want me to  │    │
│  │ write a new blog post?      │    │
│  │                             │    │
│  │ You: Yes, target "best AI   │    │
│  │ tools 2026" and publish it  │    │
│  │                             │    │
│  │ Agent: On it! I'll research │    │
│  │ competitors first...        │    │
│  │ [Running: web_search] 🔄    │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│  [Type a message...]          [Send]│
└─────────────────────────────────────┘
```

**Implementation:**
- Messages stored in Convex `messages` table
- `useQuery` subscription for real-time updates
- User sends message → Convex mutation → triggers Fly.io Machine
- Agent streams response back via Convex mutations (chunk by chunk)
- Tool calls shown as expandable cards in chat

---

## 8. Heartbeat Design

Every agent has a Convex scheduled function that fires every 30 minutes.

**Heartbeat prompt (injected as system context):**
```
You are {agent.name}, {agent.role}. This is your regular check-in.

Current time: {timestamp}
Pending tasks: {taskList}
Recent messages: {unreadMessages}
Last heartbeat: {lastHeartbeatSummary}

Check your tasks, review any new messages, and do proactive work.
If nothing needs attention, briefly note that and stand by.
Always update your MEMORY.md with anything worth remembering.
```

**Cost optimization:**
- Heartbeat uses smaller/cheaper model if agent has nothing pending
- First check is Convex-side: any pending tasks or unread messages?
- If truly nothing: still run (agent may do proactive work), but with shorter context
- User can pause/resume heartbeat per agent

---

## 9. BYOK Implementation

```
User enters API key in Settings
  → Frontend sends to Convex action
  → Convex action encrypts with AES-256-GCM:
     - ENCRYPTION_KEY (env var, master key)
     - Random IV per key
     - Stores: { encrypted, iv, tag, maskedKey }
  → When agent needs key:
     - Convex action decrypts
     - Passes plaintext to Fly.io Machine via env var
     - Machine uses key for LLM API calls
     - Key never persisted on disk, only in memory
```

---

## 10. Scaling & Cost

### Platform Costs (BYOK means users pay their own LLM costs)

| Scale | Fly.io Compute | R2 + KV | Convex | **Total** |
|-------|---------------|---------|--------|-----------|
| 10 agents | ~$3/mo | $0 | $0 | **~$3/mo** |
| 100 agents | ~$30/mo | $0 | $0 | **~$30/mo** |
| 1,000 agents | ~$300/mo | $14 | $25 | **~$340/mo** |

> Each agent: 48 heartbeats/day + ~5 chat interactions + ~3 tasks = ~56 Fly.io runs/day
> At ~2 min avg runtime: 56 × 2 min × $0.003/hr ≈ $0.006/day/agent ≈ $0.18/mo/agent

---

## 11. Launch Checklist — What We Have vs What We Need

### ✅ Already Built
- [x] Next.js frontend with Clerk auth
- [x] Convex backend (schema, agents CRUD, tasks CRUD, users)
- [x] BYOK encrypted key storage (AES-256-GCM)
- [x] Agent hiring from templates (8 templates)
- [x] Task creation and assignment
- [x] Basic task execution via LLM (Convex action)
- [x] Org chart with Convex persistence
- [x] Dashboard with real data
- [x] Onboarding checklist
- [x] Landing page with interactive demo
- [x] Mobile responsive
- [x] Dockerized agent runner (Fly.io ready)
- [x] Fly.io orchestrator in Convex (start/cancel machines)
- [x] Docker base images (base, dev, marketer)

### 🔨 Must Build for Launch
- [ ] **Chat UI** — per-agent conversation interface (send message → agent responds)
- [ ] **Chat backend** — Convex messages table, mutation to trigger agent, streaming responses
- [ ] **Heartbeat system** — Convex cron per agent (every 30 min), heartbeat prompt, status tracking
- [ ] **Agent memory** — R2 integration for SOUL.md + MEMORY.md per agent
- [ ] **Live execution UI** — show agent running in real-time (tool calls, thinking, streaming text)
- [ ] **Skills system** — skill registry in Convex, tool definitions loaded into agent prompt
- [ ] **Agent activity feed** — dashboard feed showing what agents did (heartbeat results, task completions, proactive actions)
- [ ] **Fly.io end-to-end** — deploy runner image, test full flow: Convex → Fly → agent runs → results back
- [ ] **Error handling** — timeouts, retries, rate limits, stale machine cleanup

### 🎯 Nice-to-Have for Launch
- [ ] Skill marketplace UI (browse/add skills to agents)
- [ ] Agent-to-agent delegation (CEO assigns to subordinates)
- [ ] Token usage tracking and cost estimates per agent
- [ ] Export chat/task history
- [ ] Webhook notifications (Slack/Discord/email when agent completes work)

### ❌ Post-Launch (Phase 2)
- Code execution sandbox (E2B)
- RAG / semantic memory search
- File upload / document processing
- Billing / subscription management
- Team/org features (shared agents)
- Custom skill builder UI

---

## Key Architectural Decisions

1. **Always-on agents via heartbeat** — agents are alive, not just on-demand. Every 30 min they check in, do proactive work, and report back. This is the core differentiator.

2. **Chat-first interaction** — users talk to agents, not fill out task forms. Chat is the primary UI. Tasks are created through conversation or explicitly.

3. **Convex as single orchestrator** — scheduling, real-time, task queues, message routing. No additional infrastructure needed until 10K+ agents.

4. **Fly.io for all agent execution** — heartbeats, chat responses, and task execution all run in Fly.io Machines. Stateless, pay-per-second, full Linux.

5. **Stateless agents with R2 memory** — boot → load context from R2 → work → save to R2 → die. Scales infinitely, costs nothing when idle.

6. **BYOK model** — users bring their own API keys. Platform costs are purely infrastructure. This makes pricing simple and margins healthy.
