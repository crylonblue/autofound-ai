# Agent Design: Stateless Multi-Tenant AI Agent for autofound.ai

*Research date: 2026-02-13*

## 1. How OpenClaw Works (Reference Architecture)

### Agent Loop Lifecycle
OpenClaw follows a classic agentic loop pattern:

1. **Message arrives** → Gateway receives via channel (Telegram, WhatsApp, etc.)
2. **Session resolved** → finds/creates session by key (serialized per-session to prevent races)
3. **Context assembled**:
   - System prompt built (tools, skills list, safety, runtime metadata)
   - Workspace bootstrap files injected: `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `USER.md`, `IDENTITY.md`, `HEARTBEAT.md`
   - Conversation history loaded from session transcript
   - Memory search results optionally injected
4. **Model inference** → LLM called with assembled context
5. **Tool execution** → if model requests tools, execute them, return results
6. **Loop** → steps 4-5 repeat until model produces final text response
7. **Reply delivered** → sent back via channel
8. **Session persisted** → transcript updated with new messages

### System Prompt Structure
The system prompt is OpenClaw-owned and rebuilt each run. Sections:
- **Tooling**: tool list + descriptions + JSON schemas (schemas count toward context)
- **Safety**: guardrails against power-seeking, data exfiltration
- **Skills**: compact list (name + description + file path) — model reads SKILL.md on demand
- **Workspace**: cwd path
- **Current Date & Time**: timezone only (cache-stable)
- **Runtime**: host, OS, model, thinking level (one line)
- **Project Context**: injected workspace files (AGENTS.md, SOUL.md, etc.), truncated at 20K chars/file

### Memory System
- **Daily logs**: `memory/YYYY-MM-DD.md` — append-only raw notes
- **Long-term**: `MEMORY.md` — curated, loaded only in private sessions
- **Vector search**: hybrid BM25 + semantic search over memory files via SQLite + embeddings
- **Pre-compaction flush**: silent agentic turn to write memories before context compaction

### Skills System
Skills are directories with `SKILL.md` (YAML frontmatter + instructions). Three layers:
1. Bundled (shipped with install)
2. Managed (`~/.openclaw/skills`)
3. Workspace (`<workspace>/skills`)

Skills are listed in the system prompt but instructions loaded on-demand via `read`.

### Multi-Agent
Each agent is fully isolated: own workspace, session store, auth profiles, state directory. Bindings route inbound messages to agents by channel/peer/account. Agents don't share state unless explicitly configured.

---

## 2. Stateless Adaptation for autofound.ai

### Architecture: Ephemeral Agent Workers

```
Trigger (Convex mutation/cron/webhook)
  → Cloudflare Worker spawns
  → Load context from R2:
      - SOUL.md (persona/rules)
      - MEMORY.md (long-term memory)
      - Recent conversation history (last N messages)
      - Task-specific context
  → Run agent loop:
      - Build system prompt
      - Call LLM (user's API key)
      - Execute tools
      - Loop until done
  → Write results back:
      - Updated MEMORY.md → R2
      - New messages → Convex
      - Task results → Convex
  → Worker dies
```

### Key Differences from OpenClaw

| Aspect | OpenClaw | autofound.ai |
|--------|----------|--------------|
| Lifetime | Long-lived daemon | Ephemeral per-request |
| State | Local filesystem | R2 + Convex |
| Session | In-memory + JSON transcript | Convex documents |
| Multi-tenant | Multi-agent on one host | Multi-tenant, isolated by org |
| API keys | Operator-owned | User-provided (BYOK) |
| Tools | Shell exec, filesystem, browser | R2 files, web search, sandboxed code |

### Session Management
Since workers are stateless, session state lives in Convex:
```typescript
// Convex schema
defineTable("agentSessions", {
  orgId: v.string(),
  agentId: v.string(),
  sessionKey: v.string(),
  messages: v.array(v.object({
    role: v.string(), // "user" | "assistant" | "tool"
    content: v.string(),
    timestamp: v.number(),
    toolCalls: v.optional(v.array(v.any())),
  })),
  metadata: v.object({
    model: v.string(),
    totalTokens: v.number(),
    lastCompactionAt: v.optional(v.number()),
  }),
});
```

### Compaction Strategy
When message history exceeds threshold:
1. Summarize older messages into a compaction summary
2. Keep last N messages verbatim
3. Store compaction summary as first message
4. Update session in Convex

---

## 3. BYOK (Bring Your Own Key) Implementation

### Storage Options Compared

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Encrypted in Convex** | Simple, single store | Convex team can see encrypted blobs; need key management | ✅ Best for MVP |
| **Cloudflare Workers Secrets** | Native encryption at rest | Can't be per-user (they're per-worker) | ❌ Not suitable |
| **Vault (HashiCorp)** | Gold standard | Complex, expensive, overkill | ❌ Too complex |
| **Encrypted in Convex + envelope encryption** | Strong security, per-org isolation | More complex | ✅ Best for production |

### Recommended: Envelope Encryption in Convex

```typescript
// Key hierarchy:
// 1. Master key: stored in Cloudflare Workers secret (or env var)
// 2. Per-org DEK (Data Encryption Key): encrypted by master key, stored in Convex
// 3. API keys: encrypted by per-org DEK, stored in Convex

// Store key
async function storeApiKey(orgId: string, provider: string, apiKey: string) {
  const dek = await getOrCreateDEK(orgId); // decrypt with master key
  const encrypted = await encrypt(apiKey, dek);
  await convex.mutation("apiKeys.store", { orgId, provider, encrypted });
}

// Use key at runtime
async function getApiKey(orgId: string, provider: string): Promise<string> {
  const encrypted = await convex.query("apiKeys.get", { orgId, provider });
  const dek = await getOrCreateDEK(orgId);
  return decrypt(encrypted, dek);
}
```

### Runtime Key Injection
```typescript
// Worker receives request with orgId
const apiKey = await getApiKey(orgId, "anthropic");
const client = new Anthropic({ apiKey });
// Use client for this request only — key never persisted in worker memory
```

### Key Validation
- On storage: make a minimal API call (e.g., list models) to verify key works
- On failure: mark key as invalid in Convex, notify user
- Rotation: user updates key via dashboard, old key immediately unused (stateless = no cache)

---

## 4. Tool System

### Core Tools

| Tool | Implementation | Notes |
|------|---------------|-------|
| **file_read/write** | R2 API | Scoped to org's R2 prefix (`orgs/{orgId}/agents/{agentId}/`) |
| **web_search** | Tavily API | Use platform key or user's key; `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` |
| **web_fetch** | `fetch()` in Worker | Extract readable content, return markdown |
| **code_execute** | E2B sandbox | Spin up ephemeral sandbox, run code, return output |
| **http_request** | `fetch()` in Worker | General API calls with user-defined headers |
| **agent_message** | Convex mutation | Post message to another agent's task queue |
| **memory_search** | Vectorize + R2 | Semantic search over agent's memory files |
| **memory_write** | R2 API | Append to daily log or update MEMORY.md |

### Tool Definition Format
Follow OpenClaw's pattern — tools defined as JSON Schema, injected into system prompt:

```typescript
const tools = [
  {
    name: "file_read",
    description: "Read a file from the agent's storage",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to agent root" },
        offset: { type: "number", description: "Line to start from" },
        limit: { type: "number", description: "Max lines to read" },
      },
      required: ["path"],
    },
  },
  // ... more tools
];
```

### Code Execution Options

| Option | Cold Start | Cost | Isolation | Best For |
|--------|-----------|------|-----------|----------|
| **E2B** | ~500ms | $0.10/hr | Full VM | Complex code, pip installs |
| **Cloudflare Workers** | ~0ms | Pay-per-request | V8 isolate | Simple JS/TS snippets |
| **Val Town** | ~100ms | Free tier available | V8 isolate | Quick scripts |

**Recommendation**: E2B for general code execution (supports Python, Node, shell). Cloudflare Workers for simple evaluations. Could offer both.

---

## 5. Context Window Management

### The Problem
Agent wakes with zero memory. Must reconstruct enough context to be useful within model's context window (typically 128K-200K tokens).

### Tiered Loading Strategy (Recommended)

```
Tier 1 — Always Load (system prompt, ~2-4K tokens):
  ├── SOUL.md (persona, rules, capabilities)
  ├── Org context (company name, industry, preferences)
  └── Tool definitions

Tier 2 — Recent History (~4-20K tokens):
  ├── Last N messages from this conversation
  ├── Last compaction summary (if exists)
  └── Active task context

Tier 3 — On-Demand Search (~1-4K tokens):
  ├── memory_search results (semantic)
  ├── Relevant file snippets
  └── Related task outcomes
```

### Implementation

```typescript
async function buildContext(orgId: string, agentId: string, sessionKey: string) {
  // Tier 1: Always
  const soul = await r2.get(`orgs/${orgId}/agents/${agentId}/SOUL.md`);
  const orgContext = await convex.query("orgs.getContext", { orgId });

  // Tier 2: Recent
  const session = await convex.query("sessions.get", { orgId, agentId, sessionKey });
  const messages = session.messages.slice(-50); // last 50 messages
  
  // Tier 3: Semantic (if query warrants it)
  const lastUserMessage = messages.filter(m => m.role === "user").pop();
  const memories = await vectorSearch(orgId, agentId, lastUserMessage.content, { limit: 5 });

  return assembleSystemPrompt({ soul, orgContext, messages, memories });
}
```

### Rolling Summary
Maintain a compaction summary that grows over time:
- After every N messages (e.g., 30), summarize the conversation so far
- Prepend summary to next session load
- Store summary in Convex alongside session

### Vectorize for Memory Search
Use Cloudflare Vectorize (native to Workers) or store embeddings in Convex:
- Embed MEMORY.md chunks + daily log entries
- On each agent run, search for relevant memories
- Inject top-K results into context

---

## 6. Multi-Agent Communication

### Patterns from Existing Frameworks

| Framework | Communication Model | Strengths | Weaknesses |
|-----------|-------------------|-----------|------------|
| **CrewAI** | Sequential/hierarchical task delegation | Simple mental model, built-in roles | Rigid flow, no dynamic routing |
| **AutoGen** | Conversational agents with group chat | Flexible, supports debates | Complex orchestration, hard to debug |
| **LangGraph** | State machine with edges between agents | Explicit control flow, debuggable | Requires upfront graph design |
| **Mastra** | Event-driven with workflow engine | Good TypeScript support, tool-first | Newer, less battle-tested |

### Recommended: Convex Task Queue + Pub/Sub

```typescript
// Convex schema for inter-agent communication
defineTable("agentTasks", {
  orgId: v.string(),
  fromAgentId: v.string(),
  toAgentId: v.string(),
  type: v.string(), // "request" | "response" | "broadcast"
  payload: v.object({
    message: v.string(),
    context: v.optional(v.any()),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
  }),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  result: v.optional(v.any()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});
```

### Communication Patterns

#### 1. Direct Request-Response
```
CEO Agent → "Research competitor X" → Research Agent
Research Agent → {findings} → CEO Agent
```
Implementation: mutation creates task → cron/subscription triggers target agent worker → result written back

#### 2. Hierarchical Delegation (Org Chart)
```
CEO Agent
  ├── delegates to → CTO Agent
  │     ├── delegates to → Dev Agent 1
  │     └── delegates to → Dev Agent 2
  └── delegates to → CMO Agent
```
Implementation: each agent has `parentAgentId` and `subordinateAgentIds`. Agents can only message their direct reports and parent.

#### 3. Broadcast/Pub-Sub
```
CEO Agent → "Company pivot to AI" → ALL agents
```
Implementation: Convex subscription on `agentTasks` filtered by `toAgentId` or `type: "broadcast"`

### Execution Model
Since agents are stateless workers:
1. Task created in Convex (mutation)
2. Convex action triggered (via scheduled function or HTTP action)
3. Action spawns Cloudflare Worker with task context
4. Worker runs agent loop, writes result back to Convex
5. Originating agent picks up result on next run (or via subscription-triggered re-run)

### Avoiding Infinite Loops
- Max delegation depth (e.g., 5 levels)
- Task deduplication by content hash + time window
- Per-agent rate limits in Convex
- Circuit breaker: if agent fails N times, stop delegating to it

---

## 7. Recommended Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                   User Dashboard                      │
│              (Next.js on Vercel/CF Pages)              │
│  - Configure agents, org chart, SOUL.md                │
│  - Store API keys (encrypted → Convex)                 │
│  - View agent activity, conversations                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│                    Convex Backend                      │
│  - Agent configs, org chart, task queue                 │
│  - Session history (messages)                          │
│  - Encrypted API keys                                  │
│  - Scheduled functions (cron triggers)                 │
│  - Real-time subscriptions (task completion)           │
└──────────────┬──────────────────────────────────────────┘
               │ HTTP Action / Scheduled Function
               ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare Worker (Agent Runtime)         │
│  1. Load context: SOUL.md from R2, history from Convex │
│  2. Decrypt user's API key                             │
│  3. Run agent loop (LLM call → tool → LLM → ...)      │
│  4. Write results: Convex (messages), R2 (files)       │
│  5. Die                                                │
└──────────────┬──────────────────────────────────────────┘
               │
        ┌──────┼──────┐
        ▼      ▼      ▼
      R2     LLM    E2B
   (files) (BYOK)  (code)
```

### Key Design Decisions

1. **Convex as brain, R2 as filesystem**: Convex for structured data (sessions, tasks, configs); R2 for unstructured files (SOUL.md, MEMORY.md, documents)
2. **Cloudflare Workers as compute**: Stateless, fast cold start, global edge, native R2 access
3. **Envelope encryption for BYOK**: Master key in Worker env, per-org DEKs in Convex
4. **Tiered context loading**: Always load persona + recent history; search for the rest
5. **Convex task queue for multi-agent**: Leverages Convex's real-time subscriptions for coordination
6. **E2B for code execution**: Full isolation, language-agnostic, reasonable pricing

### Worker Duration Concern
Cloudflare Workers have execution limits:
- **Standard**: 30s CPU time (free), 30s-15min (paid, depending on plan)
- **Unbound**: 30s CPU, 15min wall clock (paid)

Agent loops can be long. Mitigations:
- Use Cloudflare Workers **Unbound** (wall clock limit, not CPU)
- For very long tasks, use **Durable Objects** (persistent WebSocket, unlimited duration)
- Or run agent runtime on a lightweight container (Fly.io, Railway) instead of Workers
- Break complex tasks into sub-tasks with bounded execution time

### Alternative: Fly.io / Railway for Agent Runtime
If Worker limits are too tight:
- Spin up ephemeral Fly Machine per agent run
- ~300ms cold start, no execution time limit
- Still stateless (machine dies after task)
- More expensive but more flexible
