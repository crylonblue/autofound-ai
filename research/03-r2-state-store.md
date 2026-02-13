# Research: Cloudflare R2 as Agent State Store

**Date:** 2026-02-13
**Status:** Research complete
**Context:** autofound.ai stateless agents need persistent state storage

---

## 1. Cloudflare R2 Basics

S3-compatible object storage with **zero egress fees** (the killer feature).

### Pricing
| | Standard | Infrequent Access |
|---|---|---|
| Storage | $0.015/GB-month | $0.01/GB-month |
| Class A ops (write/list) | $4.50/million | $9.00/million |
| Class B ops (read/head) | $0.36/million | $0.90/million |
| Egress | **Free** | **Free** |
| Data retrieval | None | $0.01/GB |

### Free Tier (Forever Free)
- **10 GB** storage/month
- **1 million** Class A (write) operations/month
- **10 million** Class B (read) operations/month

### Limits
- Max object size: **5 TB** (single upload up to 5 GB, multipart for larger)
- Max metadata per object: 2 KB
- Bucket limit: 1,000 per account

### Latency
- R2 uses Cloudflare's global network but is **not edge-replicated by default**
- Typical read latency: **30-100ms** depending on region proximity
- Write latency: **50-200ms** (must reach primary storage location)
- With Workers binding: lower latency since no HTTP overhead
- **Not suitable for sub-10ms hot path** — use KV or Durable Objects for that

---

## 2. What Goes in R2

R2 is ideal for **large, infrequently-mutated blobs**:

| Data Type | Size Range | Access Pattern | R2 Fit |
|---|---|---|---|
| Agent memory files | 1-100 KB | Read on wake, write on save | ✅ Good |
| Conversation history | 10 KB - 10 MB | Append-heavy, read on context load | ✅ Good |
| Workspace files | 1 KB - 100 MB | Read/write during tasks | ✅ Good |
| Tool outputs (screenshots, PDFs) | 100 KB - 50 MB | Write once, read occasionally | ✅ Excellent |
| Uploaded documents | 1 KB - 1 GB | Write once, read many | ✅ Excellent |
| Agent config/identity | 1-10 KB | Read frequently, rarely written | ⚠️ OK (KV better) |
| Real-time status | <1 KB | Read/write every second | ❌ Use KV |

---

## 3. Proposed Directory Structure

```
/{orgId}/
  agents/
    {agentId}/
      memory/
        MEMORY.md                    # Long-term curated memory
        daily/
          2026-02-13.md              # Daily memory files
      workspace/
        {taskId}/                    # Per-task working files
          output.json
          screenshots/
      history/
        {sessionId}.jsonl            # Conversation logs (append-only)
      identity/
        SOUL.md                      # Agent identity
        config.json                  # Agent configuration
  shared/
    documents/
      {docId}                        # Org-wide uploaded documents
    knowledge/
      {knowledgeBaseId}/             # Shared knowledge bases
  exports/
    {exportId}.zip                   # Generated exports/reports
```

### Key Design Decisions
- **Flat-ish hierarchy** — R2 doesn't have real directories, `/` is just convention
- **orgId as top-level partition** — enables multi-tenancy, easy to scope access
- **Session-based history** — one file per session, JSONL for streaming appends
- **Task-scoped workspace** — isolate task artifacts, easy cleanup

---

## 4. Cloudflare KV

**Key-value store** optimized for **read-heavy, globally distributed** workloads.

### Pricing
| | Free | Paid ($5/mo Workers plan) |
|---|---|---|
| Reads | 100,000/day | 10M/month + $0.50/million |
| Writes | 1,000/day | 1M/month + $5.00/million |
| Deletes | 1,000/day | 1M/month + $5.00/million |
| Lists | 1,000/day | 1M/month + $5.00/million |
| Storage | 1 GB | 1 GB + $0.50/GB-month |

### Characteristics
- **Read latency: ~25ms** (edge-cached, eventually consistent)
- **Write propagation: up to 60 seconds** globally
- Max value size: 25 MB
- Max key size: 512 bytes
- **Eventually consistent** — not suitable for coordination

### Best For in autofound.ai
```
agent:{agentId}:status     → "online" | "busy" | "offline"
agent:{agentId}:heartbeat  → "2026-02-13T00:30:00Z"
agent:{agentId}:task       → "{taskId}"
org:{orgId}:agent-count    → "12"
cache:{hash}               → cached API responses
session:{sessionId}:meta   → small session metadata JSON
```

### Verdict
✅ **Use for hot metadata** — agent status, heartbeats, caching
❌ **Don't use for** — structured queries, large objects, write-heavy workloads

---

## 5. Cloudflare D1

**SQLite at the edge** — serverless relational database.

### Pricing
| | Free | Paid |
|---|---|---|
| Rows read | 5M/day | 25B/month + $0.001/million |
| Rows written | 100K/day | 50M/month + $1.00/million |
| Storage | 5 GB total | 5 GB + $0.75/GB-month |

### Characteristics
- Full SQL/SQLite support with indexes
- Scale-to-zero (no idle charges)
- Read replicas for global read performance
- **Single-writer model** — writes go to primary region
- Max DB size: 10 GB (paid), 500 MB (free)
- Automatic backups

### Could D1 Replace Convex?

| Capability | Convex | D1 |
|---|---|---|
| Real-time subscriptions | ✅ Native | ❌ No |
| Structured queries | ✅ | ✅ |
| Schema/migrations | ✅ Managed | ⚠️ Manual |
| Edge performance | ⚠️ Single region | ✅ Read replicas |
| Serverless functions | ✅ Built-in | ⚠️ Via Workers |
| TypeScript SDK | ✅ Excellent | ⚠️ Basic |
| Cost at scale | $$ Higher | $ Lower |

### Verdict
D1 **cannot replace Convex** for autofound.ai's core use case because:
1. **No real-time subscriptions** — Convex's reactive queries power the UI
2. **No built-in auth/permissions** — would need to rebuild
3. **Migration complexity** — already invested in Convex schema

D1 **could complement** for:
- Analytics/logging (write-heavy, query-later)
- Search indexes
- Edge-local caches of structured data

---

## 6. Hybrid Architecture (Recommended)

```
┌─────────────────────────────────────────────────────┐
│                    autofound.ai                      │
├──────────────┬──────────────┬───────────────────────┤
│   Convex     │     R2       │     KV                │
│  (Source of  │  (Blob       │  (Hot Cache)          │
│   Truth)     │   Storage)   │                       │
├──────────────┼──────────────┼───────────────────────┤
│ Users        │ Agent memory │ Agent status           │
│ Organizations│ Conv. history│ Last heartbeat         │
│ Agents (meta)│ Workspace    │ Current task ID        │
│ Tasks        │ Documents    │ Session tokens         │
│ Permissions  │ Tool outputs │ Rate limit counters    │
│ Billing      │ Exports      │ Feature flags          │
│ Real-time UI │ Backups      │ Cached API responses   │
└──────────────┴──────────────┴───────────────────────┘
```

### Data Flow
1. **Agent starts task** → Convex creates task record → KV sets `agent:status=busy`
2. **Agent needs memory** → Worker reads from R2 `/{orgId}/agents/{agentId}/memory/`
3. **Agent produces output** → Written to R2 workspace, reference stored in Convex
4. **UI queries status** → KV for instant status, Convex for task details
5. **Task completes** → Convex updates task, KV clears status, R2 stores artifacts

### Integration Pattern
```typescript
// Convex action that stores large content in R2
export const saveAgentOutput = action({
  args: { agentId: v.string(), taskId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    // Store blob in R2
    const r2Key = `${orgId}/agents/${args.agentId}/workspace/${args.taskId}/output.md`;
    await r2.put(r2Key, args.content);
    
    // Store reference in Convex
    await ctx.runMutation(internal.tasks.setOutput, {
      taskId: args.taskId,
      r2Key,
      size: args.content.length,
    });
  },
});
```

---

## 7. Alternatives to R2

| Service | Pros | Cons | Verdict |
|---|---|---|---|
| **Tigris** | S3-compatible, globally distributed, auto-caching | Smaller ecosystem, less mature | ⚠️ Watch, not ready |
| **Supabase Storage** | Integrates with Supabase auth/DB, good DX | Egress fees, tied to Supabase ecosystem | ❌ Not using Supabase |
| **AWS S3** | Most mature, best tooling | Egress fees ($0.09/GB), complex IAM | ❌ Egress costs kill it |
| **Backblaze B2** | Cheapest storage ($0.005/GB) | Less integration, slower | ❌ Not enough value |
| **MinIO (self-hosted)** | Full control, S3-compatible | Ops burden, needs infrastructure | ❌ Against serverless goal |

### Why R2 Wins
1. **Zero egress** — agents read data constantly, egress fees compound fast
2. **Cloudflare ecosystem** — Workers, KV, D1 all integrate natively
3. **S3 compatibility** — standard tooling works (aws-sdk, rclone, etc.)
4. **Generous free tier** — 10 GB + 10M reads covers early stage
5. **Workers bindings** — direct access from edge compute, no HTTP overhead

---

## 8. How OpenClaw Stores Agent State

From OpenClaw's docs and filesystem:

- **Workspace directory**: `~/.openclaw/workspace` (configurable per-agent)
- **State is filesystem-based**: AGENTS.md, SOUL.md, MEMORY.md, memory/ directory
- **Session state**: managed by gateway in-memory, not persisted to external storage
- **No built-in cloud sync** — state lives on the host machine
- **Multi-agent**: each agent can have its own workspace path

### Pattern for autofound.ai
OpenClaw's filesystem pattern maps cleanly to R2:
```
Local: ~/.openclaw/workspace/MEMORY.md
  → R2: /{orgId}/agents/{agentId}/memory/MEMORY.md

Local: ~/.openclaw/workspace/memory/2026-02-13.md  
  → R2: /{orgId}/agents/{agentId}/memory/daily/2026-02-13.md
```

Each agent instance could sync workspace ↔ R2 on session start/end.

---

## 9. Cost Estimates: 100 Agents × 10 Tasks/Day

### Assumptions
- Each task: ~5 R2 reads + 3 R2 writes
- Memory load on session start: 2 reads
- Memory save on session end: 1 write
- Average object size: 50 KB
- Agent runs ~2 sessions/day
- KV: 20 reads + 5 writes per agent per day

### Monthly Calculations (30 days)

#### R2
| Operation | Count/day | Monthly | Cost |
|---|---|---|---|
| Class B (reads) | 100 agents × (50 task reads + 4 session reads) = 5,400 | 162,000 | Free (< 10M) |
| Class A (writes) | 100 agents × (30 task writes + 2 session writes) = 3,200 | 96,000 | Free (< 1M) |
| Storage | 100 agents × ~50 MB each | ~5 GB | Free (< 10 GB) |
| **R2 Total** | | | **$0.00** ✅ |

#### KV (requires $5/mo Workers paid plan)
| Operation | Count/day | Monthly | Cost |
|---|---|---|---|
| Reads | 100 × 20 = 2,000 | 60,000 | Free (< 10M) |
| Writes | 100 × 5 = 500 | 15,000 | Free (< 1M) |
| Storage | ~10 MB | Negligible | Free (< 1 GB) |
| **KV Total** | | | **$0.00** (within paid plan) |

#### Convex (current)
- Already paying for Convex — no additional cost for metadata storage

#### Total Monthly Cost at 100 Agents
| Service | Cost |
|---|---|
| R2 | $0 (free tier) |
| KV | $0 (within Workers paid plan) |
| Workers ($5/mo plan) | $5 |
| **Total additional** | **$5/month** |

### At Scale (1,000 agents × 50 tasks/day)
| Service | Monthly ops | Cost |
|---|---|---|
| R2 reads | 2.7M | Free |
| R2 writes | 2.58M | ~$7.11 |
| R2 storage | ~100 GB | $1.35 |
| KV reads | 600K | Free |
| KV writes | 150K | Free |
| **Total** | | **~$13.46/month** |

---

## 10. Recommendations

### Phase 1 (MVP — Now)
1. **Use R2 for agent workspace/memory** — drop-in, S3-compatible, free tier covers it
2. **Use KV for agent status** — fast reads for UI polling
3. **Keep Convex for everything else** — don't migrate what works

### Phase 2 (Scale)
1. **Add D1 for analytics/logging** — query task history, agent performance
2. **Implement workspace sync** — R2 ↔ local filesystem for agent sessions
3. **Add lifecycle policies** — auto-delete old task workspaces after 30 days

### Phase 3 (Optimization)
1. **Infrequent Access tier** — move old conversation history to IA storage
2. **R2 event notifications** — trigger Workers on new uploads
3. **Consider Durable Objects** — for real-time agent coordination (WebSocket state)

### Implementation Priority
```
1. R2 bucket setup + directory structure     (1 day)
2. Convex action for R2 read/write           (1 day)  
3. KV namespace for agent status             (0.5 day)
4. Agent memory sync on session start/end    (2 days)
5. UI integration for file browsing          (2 days)
```

---

## Key Takeaway

**R2 + KV + Convex is the optimal stack.** Each handles what it's best at:
- Convex: structured data + real-time UI (keep as source of truth)
- R2: large blobs + files (zero egress = massive cost savings)
- KV: hot metadata + caching (25ms global reads)

Total cost at 100 agents: **~$5/month**. At 1,000 agents: **~$14/month**. Hard to beat.
