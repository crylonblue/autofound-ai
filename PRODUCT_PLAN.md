# autofound.ai — Full Product Plan

> AI Company Builder: Hire agents, build org charts, let them execute real work.

---

## 1. Product Vision

autofound.ai lets anyone build a functioning company run by AI agents. Not a chatbot. Not a single assistant. A **structured team** with hierarchy, communication channels, and real execution capabilities.

The founder is the CEO of their AI company. They hire from agent templates, wire up the org chart, define who talks to whom, and watch their company operate.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Dashboard │  │ Org Chart│  │ Agent Activity    │  │
│  │  & Setup  │  │ Builder  │  │ Feed & Controls   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Real-time sync
┌──────────────────────▼──────────────────────────────┐
│                  CONVEX (Backend)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Users &  │  │  Agent   │  │  Message Bus &    │  │
│  │  API Keys │  │  State   │  │  Task Queue       │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Triggers agent runs
┌──────────────────────▼──────────────────────────────┐
│              AGENT RUNTIME (Server-side)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Agent     │  │ Tool     │  │ Inter-Agent       │  │
│  │ Executor  │  │ Registry │  │ Communication     │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack
| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 + Tailwind + Framer Motion | App router, SSR, great DX |
| State & DB | Convex | Real-time sync, serverless functions, no infra to manage |
| Auth | Clerk | Easy setup, social login, org management |
| Agent Runtime | Node.js workers on Fly.io | Scalable, per-user isolation, WebSocket comms |
| LLM Access | User's own keys (BYOK) | No margin on AI costs, user controls spend |
| Payments | Stripe | Standard, EU-compliant |
| Deployment | Vercel (frontend) + Fly.io (runtime) | Global edge + persistent workers |

---

## 3. Data Model (Convex)

### Core Tables

```typescript
// users — account + subscription
users: {
  clerkId: string
  email: string
  plan: "free" | "growth" | "business" | "enterprise"
  apiKeys: {                    // encrypted, per-provider
    openai?: string
    anthropic?: string
    google?: string
  }
  createdAt: number
}

// companies — each user can have multiple AI companies
companies: {
  userId: Id<"users">
  name: string
  description: string
  status: "active" | "paused" | "archived"
  settings: {
    defaultModel: string       // e.g. "claude-sonnet-4-20250514"
    approvalMode: "all" | "external" | "none"
    timezone: string
  }
  createdAt: number
}

// agents — individual AI employees
agents: {
  companyId: Id<"companies">
  templateId?: Id<"templates">  // if created from template
  name: string
  role: string                  // "CEO", "Content Writer", etc.
  department: string            // "executive", "marketing", etc.
  systemPrompt: string
  model: string                 // which LLM to use
  tools: string[]               // enabled tool IDs
  managerId?: Id<"agents">      // who they report to
  status: "active" | "paused" | "terminated"
  schedule?: {                  // when agent is "on shift"
    cron?: string               // e.g. "0 9 * * 1-5" (weekdays 9am)
    timezone: string
  }
  stats: {
    tasksCompleted: number
    messagesHandled: number
    tokensUsed: number
    lastActive: number
  }
  createdAt: number
}

// orgConnections — who can communicate with whom
orgConnections: {
  companyId: Id<"companies">
  fromAgentId: Id<"agents">
  toAgentId: Id<"agents">
  type: "reports_to" | "peers" | "cross_dept" | "broadcast"
  permissions: {
    canAssignTasks: boolean
    canEscalate: boolean
    canRequestInfo: boolean
  }
}

// messages — inter-agent communication log
messages: {
  companyId: Id<"companies">
  fromAgentId: Id<"agents"> | "founder"
  toAgentId: Id<"agents"> | "founder"
  content: string
  type: "task" | "report" | "question" | "escalation" | "info"
  taskId?: Id<"tasks">
  status: "sent" | "read" | "acted_on"
  createdAt: number
}

// tasks — work items flowing through the org
tasks: {
  companyId: Id<"companies">
  title: string
  description: string
  assignedTo: Id<"agents">
  assignedBy: Id<"agents"> | "founder"
  status: "pending" | "in_progress" | "needs_approval" | "completed" | "failed"
  priority: "low" | "normal" | "high" | "urgent"
  output?: string              // result/deliverable
  approvedBy?: "founder" | Id<"agents">
  deadline?: number
  createdAt: number
  completedAt?: number
}

// templates — reusable agent blueprints
templates: {
  name: string
  role: string
  department: string
  systemPrompt: string
  suggestedTools: string[]
  suggestedConnections: string[] // role names this template typically connects to
  icon: string
  isOfficial: boolean           // autofound.ai curated vs community
  createdBy?: Id<"users">
  installs: number
  createdAt: number
}

// tools — available integrations
tools: {
  id: string                    // "web_search", "email_send", etc.
  name: string
  description: string
  category: "communication" | "research" | "content" | "code" | "finance" | "crm"
  requiresApiKey?: string       // which provider key is needed
  riskLevel: "safe" | "review" | "dangerous"
  enabled: boolean
}

// activityLog — audit trail of everything
activityLog: {
  companyId: Id<"companies">
  agentId?: Id<"agents">
  action: string                // "task_completed", "message_sent", "tool_used", etc.
  details: any
  tokensUsed?: number
  cost?: number
  createdAt: number
}
```

---

## 4. Feature Breakdown by Phase

### Phase 1 — MVP (8 weeks)
**Goal:** One working company with 3-5 agents that collaborate and produce output.

#### 4.1 Onboarding & Setup
- [ ] Sign up with Clerk (Google, GitHub, email)
- [ ] BYOK wizard: enter API keys, test connection, encrypted storage
- [ ] Create first company (name, description)
- [ ] Guided setup: pick a starter org template or start blank

#### 4.2 Agent Management
- [ ] Create agents from templates (8 starter templates: CEO, Writer, SEO, Dev, Sales, Bookkeeper, HR, Support)
- [ ] Custom agent creation (role, prompt, tools, model)
- [ ] Agent detail page: view activity, edit config, pause/resume
- [ ] Per-agent model selection (Claude, GPT-4, Gemini, etc.)

#### 4.3 Org Chart Builder
- [ ] Visual drag-and-drop canvas (React Flow)
- [ ] Create reporting lines (manager → report)
- [ ] Define peer connections (cross-department communication)
- [ ] Set communication permissions per connection
- [ ] Preset org templates: "Solo Founder", "Content Agency", "SaaS Startup"

#### 4.4 Task System
- [ ] Founder creates tasks, assigns to any agent
- [ ] CEO agent can break down tasks and delegate to department agents
- [ ] Task status flow: pending → in_progress → needs_approval → completed
- [ ] Approval gates: founder reviews before external actions (emails, posts, etc.)
- [ ] Task output viewer (see what the agent produced)

#### 4.5 Inter-Agent Messaging
- [ ] Agents send messages to connected agents based on org graph
- [ ] Message types: task assignment, status report, question, escalation
- [ ] Real-time message feed (Convex subscriptions)
- [ ] Escalation routing: if agent can't handle → escalate to manager

#### 4.6 Agent Execution Runtime
- [ ] Server-side agent runner (Fly.io machines, one per active agent)
- [ ] Tool execution sandbox (web search, content generation, file creation)
- [ ] Token tracking per agent per run
- [ ] Rate limiting & cost guards (user-configurable spend limits)
- [ ] Execution log with full transparency

#### 4.7 Founder Dashboard
- [ ] Activity feed: real-time stream of what all agents are doing
- [ ] Approval queue: pending actions that need founder sign-off
- [ ] Cost tracker: tokens used, estimated $ per agent per day
- [ ] Company health: active agents, tasks completed, pending items
- [ ] Quick actions: pause all, message any agent, create task

#### 4.8 Built-in Tools (MVP set)
| Tool | Category | Risk |
|------|----------|------|
| Web Search | Research | Safe |
| Content Generator | Content | Safe |
| File Writer | Content | Safe |
| Internal Message | Communication | Safe |
| Task Creator | Management | Safe |
| Email Draft | Communication | Review |
| Social Media Draft | Content | Review |
| Code Executor (sandboxed) | Code | Review |

---

### Phase 2 — Growth (weeks 9-16)
**Goal:** Real integrations, template marketplace, smarter agents.

#### 4.9 Tool Integrations
- [ ] Email: Gmail / Outlook (OAuth) — send, read, draft
- [ ] Social: Twitter/X, LinkedIn — post, schedule, monitor
- [ ] CRM: HubSpot, Pipedrive — read/write contacts, deals
- [ ] Calendar: Google Calendar — schedule, check availability
- [ ] Storage: Google Drive, Notion — read/write documents
- [ ] Analytics: Google Analytics, Umami — pull reports

#### 4.10 Template Marketplace
- [ ] Community-submitted agent templates
- [ ] Template rating & review system
- [ ] "Install" a template → adds agent to your org with one click
- [ ] Template categories (by department, by use case, by industry)
- [ ] Revenue share: template creators earn from premium templates

#### 4.11 HR Agent (Dynamic Scaling)
- [ ] HR agent monitors workload across the org
- [ ] Auto-suggest spawning new agents when queue backs up
- [ ] Clone agents: duplicate a high-performing agent config
- [ ] Agent performance metrics: tasks/day, quality scores, token efficiency
- [ ] "Fire" underperforming agents (archive + replace)

#### 4.12 Scheduled Shifts
- [ ] Cron-based agent schedules ("Writer works Mon-Fri 9-17")
- [ ] Event-triggered activation ("Sales activates when new lead arrives")
- [ ] Heartbeat system: agents check in periodically for new tasks
- [ ] Shift handoff: night-shift agent briefing day-shift agent

#### 4.13 Advanced Communication
- [ ] Broadcast channels (CEO → all, department-wide)
- [ ] Async daily/weekly reports (agents summarize their work)
- [ ] Meeting simulation: multi-agent discussion on a topic
- [ ] Founder can "sit in" on agent-to-agent conversations

---

### Phase 3 — Scale (weeks 17-24)
**Goal:** Multi-user, agencies, analytics, mobile.

#### 4.14 Multi-User & Teams
- [ ] Invite human co-founders / team members
- [ ] Role-based access: admin, manager, viewer
- [ ] Human team members can be "in the org chart" alongside agents
- [ ] Assign approval authority to human team members

#### 4.15 Client Workspaces (Agency Mode)
- [ ] Create separate AI companies per client
- [ ] Agency dashboard: overview of all client companies
- [ ] Per-client billing & cost tracking
- [ ] Share templates across client orgs
- [ ] White-label option

#### 4.16 Analytics & Intelligence
- [ ] Agent performance dashboards (tasks, speed, quality, cost)
- [ ] Company-wide KPIs (output volume, cost per task, approval rates)
- [ ] Cost optimization suggestions ("Agent X uses 3x tokens of Agent Y for similar tasks")
- [ ] Anomaly detection ("CFO agent spending 10x more tokens than usual")

#### 4.17 Mobile App
- [ ] Founder oversight on the go (React Native)
- [ ] Push notifications for approvals & escalations
- [ ] Quick approve/reject from notification
- [ ] Voice commands to agents

#### 4.18 API & Webhooks
- [ ] REST API for external automation
- [ ] Webhooks: task_completed, escalation, approval_needed
- [ ] Zapier / Make.com integration
- [ ] CLI tool for power users

---

## 5. Pricing Model

| Tier | Price | Agents | Companies | Features |
|------|-------|--------|-----------|----------|
| **Starter** | Free | 3 | 1 | Basic org chart, starter templates, 100 tasks/mo |
| **Growth** | €29/mo | 15 | 3 | Custom templates, tool integrations, schedules, 1K tasks/mo |
| **Business** | €79/mo | Unlimited | 10 | API access, analytics, team collaboration, unlimited tasks |
| **Enterprise** | Custom | Unlimited | Unlimited | SSO, audit logs, SLA, dedicated support, custom integrations |

**Key:** We charge for the platform, not the AI. Users pay their own LLM providers directly (BYOK). This keeps us capital-efficient and avoids the margin-on-API-calls trap.

### Revenue Projections (Conservative)
| Month | Users | MRR | Notes |
|-------|-------|-----|-------|
| 3 | 50 | €500 | Beta launch, mostly free tier |
| 6 | 200 | €3K | Growth tier adoption |
| 12 | 1,000 | €20K | Business tier + word of mouth |
| 18 | 5,000 | €80K | Template marketplace revenue kicks in |

---

## 6. Go-to-Market Strategy

### Launch (Month 1-2)
1. **Private beta** with 50 hand-picked founders from Indie Hackers, Twitter/X, HN
2. **"Build in public"** on Twitter — share daily agent outputs, org chart screenshots
3. **Launch video**: screen recording of setting up a 5-agent company in 5 minutes
4. **Waitlist** with referral incentive (invite 3 → skip the queue)

### Growth (Month 3-6)
1. **Product Hunt launch** — target #1 Product of the Day
2. **Content marketing**: "I ran my startup with AI employees for 30 days" blog series
3. **YouTube**: tutorials, use-case walkthroughs, comparison videos
4. **Community**: Discord server for founders sharing agent templates & strategies
5. **Cross-promote** from EU-SaaS, CompareGen (we already have the content infra)

### Scale (Month 6-12)
1. **Template marketplace** — creators drive organic growth
2. **Agency partnerships** — agencies using autofound for clients become evangelists
3. **Integration partnerships** — featured in CRM/email tool marketplaces
4. **Conference talks** — "Multi-Agent Systems for Real Business" at AI/SaaS events

---

## 7. Competitive Landscape

| Competitor | What they do | Our advantage |
|-----------|-------------|---------------|
| **CrewAI** | Multi-agent framework (code-first) | We're no-code, visual, business-focused |
| **AutoGPT** | Single autonomous agent | We have structured hierarchy, not chaos |
| **Relevance AI** | AI workforce platform | We're BYOK, cheaper, more transparent |
| **Taskade** | AI-powered project management | We go deeper on agent autonomy & collaboration |
| **OpenClaw** | Personal AI agent platform | We productize multi-agent for business (OpenClaw is our secret weapon / dog food) |

**Our moat:**
1. Org chart + hierarchy is a genuinely novel UX for multi-agent
2. BYOK means we're the cheapest option for power users
3. Template marketplace creates network effects
4. We're eating our own dog food (OpenClaw + Bob = proof it works)

---

## 8. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM quality varies (BYOK) | Agents behave differently per provider | Model-specific prompt tuning, recommended models per role |
| Agent loops (A asks B asks A...) | Infinite token burn | Max message depth per conversation, circuit breaker patterns |
| Users hit API rate limits | Agents stall | Queue system with backoff, parallel execution limits |
| Sensitive data in agent comms | Security/compliance risk | Client-side encryption, no server-side key storage, SOC 2 path |
| Convex scaling limits | Performance at scale | Convex handles this well, but plan Fly.io fallback for compute |
| Competitor copies org chart UX | Feature parity | Move fast, build community moat, template marketplace lock-in |

---

## 9. Success Metrics

### Product
- **Activation rate**: % of signups who create ≥1 company with ≥3 agents
- **Task completion rate**: % of tasks that reach "completed" without human intervention
- **Agent collaboration rate**: avg messages exchanged between agents per task
- **Daily active companies**: companies with ≥1 agent active in last 24h

### Business
- **MRR growth**: month-over-month revenue
- **Conversion rate**: free → paid
- **Churn rate**: target <5% monthly
- **LTV:CAC ratio**: target >3:1

### Community
- **Templates published**: community-contributed agent templates
- **Discord members**: engaged community size
- **NPS score**: target >50

---

## 10. Immediate Next Steps (This Week)

1. **Set up Convex project** — schema, auth, basic CRUD
2. **Build org chart editor** — React Flow canvas, drag-and-drop agents
3. **Implement 3 starter templates** — CEO, Writer, SEO with working prompts
4. **Agent execution PoC** — one agent receiving a task and producing output via LLM
5. **Inter-agent messaging PoC** — CEO delegating to Writer, Writer reporting back
6. **Deploy MVP skeleton** — auth + dashboard + empty org chart on autofound.ai

---

*This plan is a living document. Update as we learn from beta users.*
*Last updated: 2026-02-11*
