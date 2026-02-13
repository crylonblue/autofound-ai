# Agent Runtime Concept — autofound.ai

## Overview

Build an agentic runtime for autofound.ai using the same core libraries that power OpenClaw.
Users hire AI agent templates, assign tasks, and agents execute them autonomously with tool access.

---

## Architecture Stack

```
┌──────────────────────────────────────────────────┐
│  autofound.ai (Next.js + Convex)                 │
│                                                   │
│  ┌─────────────┐  ┌───────────────────────────┐  │
│  │ Frontend     │  │ API Routes (Node.js)      │  │
│  │ - Dashboard  │  │ - POST /api/agent/run     │  │
│  │ - Tasks UI   │  │ - SSE streaming           │  │
│  │ - Live logs  │  │ - Tool execution          │  │
│  └──────┬───────┘  └──────────┬────────────────┘  │
│         │                     │                    │
│  ┌──────┴─────────────────────┴────────────────┐  │
│  │ Convex (State Layer)                        │  │
│  │ - Users, Agents, Tasks, Messages            │  │
│  │ - Encrypted BYOK API keys                   │  │
│  │ - Agent memory/workspace files              │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ @mariozechner/pi-ai        (LLM layer)      │  │
│  │ - streamSimple() — unified streaming        │  │
│  │ - getModel() — 150+ models                  │  │
│  │ - OpenAI, Anthropic, Google, Azure, etc.    │  │
│  ├─────────────────────────────────────────────┤  │
│  │ @mariozechner/pi-agent-core (agent loop)    │  │
│  │ - agentLoop() — tool calling loop           │  │
│  │ - Streaming events                          │  │
│  │ - Steering + follow-up messages             │  │
│  │ - Abort/timeout support                     │  │
│  ├─────────────────────────────────────────────┤  │
│  │ Our Tools (adapted from OpenClaw)           │  │
│  │ - web_search (Brave API)                    │  │
│  │ - web_fetch (URL → markdown)                │  │
│  │ - file_read / file_write (Convex storage)   │  │
│  │ - image_analyze (vision models)             │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## How OpenClaw Uses pi-agent-core + pi-ai

### The Agent Loop (`pi-agent-core`)

Source: `github.com/badlogic/pi-mono/packages/agent` (1495 lines)

The core loop is 307 lines (`agent-loop.js`):

```typescript
agentLoop(prompts, context, config) → EventStream<AgentEvent>
```

**Loop flow:**
1. Add user prompt to context
2. Call LLM via `streamSimple()` with tools + system prompt
3. If LLM returns tool calls → execute each tool → add results to context → goto 2
4. If LLM returns text (no tools) → agent is done
5. Check for steering messages (user interrupts) after each tool
6. Check for follow-up messages when agent would stop

**Key config we provide:**
- `model` — from `getModel("openai", "gpt-4o")`
- `apiKey` — user's BYOK key (decrypted)
- `convertToLlm` — transforms our message format to LLM format
- `transformContext` — context window management (pruning old messages)
- `getSteeringMessages` — check if user sent new input mid-run
- `getFollowUpMessages` — queue follow-up tasks

### The LLM Layer (`pi-ai`)

Source: `github.com/badlogic/pi-mono/packages/ai` (22k lines)

Handles all provider-specific details:
- `streamSimple(model, context, options)` — unified streaming for all providers
- `getModel("anthropic", "claude-sonnet-4-20250514")` — model resolution
- Automatic tool calling format conversion per provider
- Token counting, cost calculation

### OpenClaw's Heartbeat System

**What it is:** A periodic agent invocation (default every 30 minutes) that keeps agents "alive" and proactive.

**How it works in OpenClaw:**
1. Gateway runs a timer (configurable, default 30m)
2. On tick, injects a heartbeat message into the main session:
   ```
   "Read HEARTBEAT.md if it exists. Follow it strictly.
    If nothing needs attention, reply HEARTBEAT_OK."
   ```
3. This triggers a full agent loop — the agent can read files, check APIs, do work
4. If agent replies `HEARTBEAT_OK` → suppressed (no notification to user)
5. If agent replies with content → delivered to user (e.g., "You have 3 urgent emails")

**HEARTBEAT.md** is a user-editable file that tells the agent what to check:
```markdown
## Check inbox for urgent emails
## Check calendar for events in next 2 hours
## If any Kanban tasks in backlog, work on them
```

**Cron system** handles scheduled one-shot and recurring jobs:
- `systemEvent` jobs inject text into the main session
- `agentTurn` jobs run isolated agent sessions with their own context
- Both support different models, thinking levels, timeouts

### How We Adapt This for autofound.ai

**For our multi-tenant SaaS:**

| OpenClaw (single-tenant) | autofound.ai (multi-tenant) |
|--------------------------|----------------------------|
| Heartbeat on local machine | Scheduled tasks per user via Convex |
| HEARTBEAT.md file | Agent config in Convex DB |
| Single session on Gateway | Isolated runs per task |
| Shell/file access | Sandboxed tools only |
| One user's API keys | Per-user encrypted BYOK |
| Local workspace files | Convex file storage |

**Our heartbeat equivalent:**
1. Each agent can have a `schedule` config (cron expression or interval)
2. Convex scheduled function triggers agent runs
3. Agent runs with its system prompt + scheduled task prompt
4. Results stored in task history, user notified if noteworthy

---

## Tools — What We Copy from OpenClaw

### web_search (from `src/agents/tools/web-search.ts`, 776 lines)

**What it does:** Brave Search API integration
- Query parameter, count, country, language, freshness filters
- Returns titles, URLs, snippets
- Result formatting and truncation

**Adaptation needed:**
- Remove OpenClaw config dependency → pass Brave API key directly
- Remove caching (or use Convex for cache)
- Remove CLI formatting helpers
- Keep core Brave API call + result formatting (~200 lines)

### web_fetch (from `src/agents/tools/web-fetch.ts`, 850 lines)

**What it does:** Fetch URL → extract readable content
- HTML → Markdown conversion (Readability + Turndown)
- Text extraction mode
- Content truncation (maxChars)
- SSRF protection

**Adaptation needed:**
- Remove config dependency
- Keep Readability + Turndown pipeline
- Keep SSRF checks (important for multi-tenant!)
- ~300 lines core

### image_analyze (from `src/agents/tools/image-tool.ts`, 479 lines)

**What it does:** Analyze images using vision models
- Send image URL/base64 to vision model
- Get description/analysis back

**Adaptation needed:**
- Use user's own API key for vision calls
- Straightforward port

### memory (new, inspired by `src/agents/tools/memory-tool.ts`)

**What it does in OpenClaw:** Semantic search over MEMORY.md files
**Our version:** Read/write agent memory in Convex
- `memory_read` — get agent's persistent memory
- `memory_write` — update agent's persistent memory
- Stored per-agent in Convex, persists across tasks

---

## Implementation Plan

### Phase 1: Agent Loop + Basic Tools (2-3 days)
1. `npm install @mariozechner/pi-ai @mariozechner/pi-agent-core`
2. Create `src/lib/agent-runtime.ts` — wires agentLoop with BYOK
3. Create `src/lib/tools/` — web_search, web_fetch
4. Create `POST /api/agent/run` — SSE streaming endpoint
5. Update Convex schema: add `messages` array to tasks

### Phase 2: UI + Streaming (1-2 days)
1. Task detail page with live execution log
2. Show tool calls, results, thinking in real-time
3. Show final output when done

### Phase 3: Scheduled Runs / Heartbeat (1-2 days)
1. Agent schedule config (cron/interval)
2. Convex scheduled functions to trigger runs
3. Notification system for noteworthy results

### Phase 4: Advanced Tools (ongoing)
1. `file_read` / `file_write` (Convex storage)
2. `code_execute` (E2B sandboxes)
3. `email_send`, `calendar_check` (OAuth integrations)
4. Agent-to-agent communication (via Convex)

---

## Key Decisions

1. **npm install, don't fork** — pi-ai and pi-agent-core are stable, well-designed packages. No need to modify the core. Our customization lives in tools and the API layer.

2. **Next.js API routes, not Convex actions** — The agent loop needs streaming, long execution (minutes), and network access. Convex actions have 10s timeout. API routes can run for minutes and stream SSE.

3. **Tools are sandboxed** — No shell access, no file system. Tools can only: search web, fetch URLs, read/write Convex storage, analyze images. This is critical for multi-tenant security.

4. **BYOK stays** — Each user provides their own LLM API keys. We decrypt at runtime, pass to pi-ai's `streamSimple()`. We never see their prompts or outputs (except tool routing).

---

## Source References

- **pi-mono repo:** `github.com/badlogic/pi-mono`
  - `packages/ai` — LLM layer (22k lines)
  - `packages/agent` — Agent loop (1.5k lines)
  - `packages/coding-agent` — Reference implementation (37k lines)
  - `packages/web-ui` — Chat UI components (14k lines)
- **OpenClaw repo:** `github.com/openclaw/openclaw`
  - `src/agents/tools/web-search.ts` — Brave Search tool
  - `src/agents/tools/web-fetch.ts` — URL fetch + readability
  - `src/agents/tools/image-tool.ts` — Vision analysis
  - `src/auto-reply/heartbeat.ts` — Heartbeat system
  - `src/cron/` — Cron/scheduling system
- **Installed packages (local):**
  - `/usr/lib/node_modules/openclaw/` — Full OpenClaw install
  - `/root/.openclaw/workspace/openclaw/` — Cloned source
  - `/root/.openclaw/workspace/pi-mono/` — Cloned pi-mono
