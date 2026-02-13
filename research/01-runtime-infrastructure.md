# Stateless Agent Runtime Infrastructure Research

**Date:** 2026-02-13  
**Context:** Stateless AI agent execution — boot → pull context from R2 → call LLM APIs → use tools → write results to R2 → die.

---

## Executive Summary

For stateless AI agents at scale, **Cloudflare Workers** is the best fit for CPU-only agent orchestration (cheapest, fastest cold start, unlimited duration on wall-clock). **Fly.io Machines** is the best alternative when you need full Linux containers or longer CPU-bound work. Modal excels if GPU inference is needed. Lambda is a fallback for AWS-native shops. Hatchet/Inngest are orchestration layers, not runtimes.

---

## Comparison Matrix

| Feature | Cloudflare Workers (Standard) | Fly.io Machines | Modal.com | AWS Lambda | Hatchet / Inngest |
|---|---|---|---|---|---|
| **Type** | V8 isolate (JS/Wasm) | Full VM (any language) | Container (any language) | Container/runtime | Orchestration layer |
| **Cold Start** | ~0ms (isolate) | ~300ms (microVM) | ~1-3s (container) | 100ms–10s (varies) | N/A (uses your compute) |
| **Max Duration** | Unlimited wall-clock; 5 min CPU time per request | Unlimited (machine runs until stopped) | Unlimited (container runs until done) | 15 minutes hard cap | Depends on underlying compute |
| **Memory** | 128 MB | Up to 128 GB | Up to 256 GB+ | 128 MB – 10 GB | N/A |
| **Streaming** | ✅ Yes (ReadableStream, WebSocket) | ✅ Yes (full TCP/HTTP) | ✅ Yes (web endpoints) | ✅ Response streaming via Lambda URLs | N/A |
| **Concurrency** | Unlimited (auto-scales globally) | Limited by fleet size (auto-scale with config) | 100 containers free; 1000 on Team | 1000 default (up to 10k+) | 5–500+ concurrent steps |
| **GPU Support** | ❌ No | ✅ Yes (A100, L40S) | ✅ Yes (A10G, A100, H100) | ❌ No | N/A |
| **Multi-tenant** | ✅ Workers for Platforms | Manual per-tenant machines | Workspace isolation | Per-account isolation | Tenant-aware workflows |

---

## Detailed Analysis

### 1. Cloudflare Workers (Standard pricing model)

**Pricing (Paid — $5/mo base):**
- **Requests:** 10M included/mo, then $0.30/million
- **CPU time:** 30M CPU-ms included/mo, then $0.02/million CPU-ms
- **Duration (wall-clock):** Free, unlimited
- **KV reads:** 10M/mo included, then $0.50/million

**Limits:**
- 128 MB memory per isolate
- 5 min max CPU time per HTTP request, 15 min per Cron/Queue
- 10,000 subrequests per request (paid)
- 6 simultaneous outgoing connections
- 10 MB worker bundle size (paid)
- No native file system, no arbitrary binaries

**Key Strengths:**
- Near-zero cold start (~0ms, V8 isolate reuse)
- Global edge deployment (300+ locations)
- Wall-clock time is free — only CPU cycles count. Agent waiting on LLM API responses costs nothing.
- Workers for Platforms enables multi-tenant isolation
- Extremely cheap at scale: 100M requests/mo ≈ $45

**Key Weaknesses:**
- 128 MB memory is tight for complex agent state
- JS/Wasm only — no Python, no shell commands, no arbitrary tool execution
- 6 simultaneous connections limit constrains parallel tool use
- Can't run arbitrary Docker containers or CLI tools

**Cost Example (agent workload):**
- 1M agent runs/mo, each ~50ms CPU, ~10s wall-clock (waiting on LLM)
- Requests: free (under 10M)
- CPU: 50M CPU-ms → (50M - 30M) × $0.02/M = $0.40
- **Total: ~$5.40/mo**

---

### 2. Fly.io Machines

**Pricing (pay per second, billed while running):**
- shared-cpu-1x, 512MB: **$0.0046/hr** ($3.32/mo if always-on)
- shared-cpu-1x, 1GB: **$0.0082/hr** ($5.92/mo)
- performance-1x, 2GB: **$0.0447/hr** ($32.19/mo)
- Stopped machines: ~$0.15/GB/mo for rootfs storage only

**Limits:**
- No hard duration limit — machine runs until you stop it
- Memory: up to 128 GB
- Full Linux VM — run anything
- Auto-stop/start with `auto_stop_machines` and `auto_start_machines`

**Key Strengths:**
- Full Linux environment — run any language, any tool, any binary
- ~300ms cold start (Firecracker microVM)
- Pay-per-second billing with auto-stop (true scale-to-zero)
- Global regions available
- Perfect for agents that need shell access, file system, tool execution

**Key Weaknesses:**
- 300ms cold start adds latency vs Workers' ~0ms
- Need to manage machine lifecycle (create, start, stop, destroy)
- No built-in orchestration — need external queue/scheduler
- More expensive than Workers for high-volume simple tasks

**Cost Example (agent workload):**
- 1M agent runs/mo, each ~10s duration, shared-cpu-1x/512MB
- 1M × 10s = 10M seconds ≈ 2,778 hours
- 2,778 hrs × $0.0046/hr = **$12.78/mo**

---

### 3. Modal.com

**Pricing:**
- **CPU:** $0.0000394/core/sec (~$0.142/core/hr)
- **Memory:** $0.00000672/GiB/sec (~$0.0242/GiB/hr)
- **Free tier:** $30/mo credits (Starter), $100/mo credits (Team at $250/mo)
- Minimum 0.125 cores per container

**Limits:**
- Starter: 100 containers + 10 GPU concurrency
- Team ($250/mo): 1000 containers + 50 GPU concurrency
- Cold start: ~1-3s for containers (faster with image caching)
- No hard duration limit

**Key Strengths:**
- First-class GPU support (A10G, A100, H100)
- Python-native developer experience
- Serverless containers — true scale-to-zero
- Great for AI workloads that need local model inference
- Built-in web endpoints, crons, volumes

**Key Weaknesses:**
- Higher cold start than Workers/Fly
- Python-centric ecosystem
- More expensive for CPU-only workloads vs Workers
- Container concurrency limits on free/starter tier

**Cost Example (agent workload, CPU-only):**
- 1M runs/mo, 0.25 cores, 512MB, 10s each
- CPU: 1M × 0.25 × 10 × $0.0000394 = $98.50
- Memory: 1M × 0.5 × 10 × $0.00000672 = $33.60
- **Total: ~$132/mo** (minus $30 free credits = ~$102)

---

### 4. AWS Lambda

**Pricing:**
- **Requests:** $0.20/million
- **Duration (x86):** $0.0000166667/GB-sec
- **Duration (Arm/Graviton):** $0.0000133334/GB-sec
- **Free tier:** 1M requests + 400K GB-sec/mo (perpetual)

**Limits:**
- **Max duration: 15 minutes** (hard cap)
- Memory: 128 MB – 10,240 MB (10 GB)
- Concurrency: 1000 default, up to 10,000+ with request
- Cold start: ~100ms (provisioned concurrency available), 1-10s without
- Response streaming via Lambda Function URLs
- 6 MB response payload (250 MB with streaming)

**Key Strengths:**
- Massive ecosystem and AWS integrations
- Provisioned concurrency eliminates cold starts
- Graviton (Arm) offers 34% better price/performance
- Battle-tested at enormous scale
- Lambda Managed Instances for steady-state workloads

**Key Weaknesses:**
- **15-minute hard limit** — problematic for long-running agents
- Cold starts can be 1-10s without provisioned concurrency
- Complex pricing with many dimensions
- Vendor lock-in to AWS ecosystem
- No GPU support

**Cost Example (agent workload):**
- 1M runs/mo, 512MB, 10s each (Arm)
- Requests: 1M × $0.20/M = $0.20
- Duration: 1M × 0.5GB × 10s × $0.0000133334 = $66.67
- Free tier: -400K GB-sec = saves ~$5.33
- **Total: ~$61.54/mo**

---

### 5. Hatchet.run / Inngest (Orchestration Platforms)

These are **not runtimes** — they orchestrate work across your existing compute.

#### Inngest
- **Free:** 50K executions/mo, 5 concurrent steps
- **Pro ($75/mo):** 1M executions included, then $50/million; 100 concurrent steps
- **Enterprise:** Custom pricing, up to 50K concurrent steps
- Features: Durable execution, retries, fan-out, cron, event-driven

#### Hatchet
- Open-source task queue / workflow engine
- Self-hostable (free) or managed cloud
- Pricing: not publicly listed (JS-rendered page), likely usage-based
- Features: DAG-based workflows, retries, rate limiting, priority queues

**Key Strengths:**
- Durable execution with automatic retries
- Step-based workflows (agent can checkpoint between steps)
- Built-in concurrency control and rate limiting
- Language-agnostic (call your compute via HTTP)
- Inngest supports both serverless (your functions) and long-running workers

**Key Weaknesses:**
- Additional cost layer on top of compute
- Add latency for orchestration overhead
- Inngest free tier is very limited (5 concurrent)
- Not a replacement for the runtime itself

---

## Cost Comparison Summary (1M agent runs/mo, 10s each)

| Platform | Monthly Cost | Notes |
|---|---|---|
| **Cloudflare Workers** | **~$5.40** | Only if agent logic fits in JS/Wasm, 128MB |
| **Fly.io Machines** | **~$12.78** | Full Linux, any language, any tools |
| **AWS Lambda (Arm)** | **~$61.54** | Includes free tier savings |
| **Modal.com** | **~$102** | CPU-only; much better value for GPU workloads |
| **Inngest Pro** | **$75 + compute** | Orchestration only, compute cost is additive |

---

## Recommendation

### For autofound.ai Stateless Agents

**Primary: Cloudflare Workers** — if the agent can be implemented in JS/TS:
- Near-zero cold start, unlimited wall-clock (LLM wait time is free)
- $5-50/mo for millions of agent runs
- Workers for Platforms enables multi-tenant isolation
- R2 integration is native and fast (same network)
- Use Workers AI for lightweight inference, external APIs for heavy models

**Fallback: Fly.io Machines** — when agents need:
- Full Linux environment (shell tools, Python, file system)
- More than 128MB memory
- Arbitrary binary execution
- Use the Machines API to spin up/down per task (~300ms cold start)

**Recommended Architecture:**
```
User Request → Cloudflare Worker (orchestrator)
  → Pull agent context from R2
  → Call LLM API (streaming, wall-clock free)
  → For simple tool calls: handle in-worker (fetch, KV, D1)
  → For complex tools: dispatch to Fly.io Machine (shell, code exec)
  → Write results to R2
  → Return response / stream to user
```

**Why not the others?**
- **Lambda:** 15-min hard cap is a risk for complex agents; higher cost; cold starts
- **Modal:** Great for GPU workloads but 3-5x more expensive for CPU-only agents
- **Hatchet/Inngest:** Useful as an orchestration layer on top, not a replacement. Consider Inngest if you need durable multi-step workflows with retry guarantees — but add it later, not as the starting point.

### If GPU inference is needed later:
Add Modal.com as a sidecar for model serving, called from Workers via HTTP. Keep orchestration in Workers, heavy compute in Modal.
