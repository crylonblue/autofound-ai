# autofound.ai — AI Company Builder

## Tagline
**Build your company with AI employees. Hire agents, define org charts, let them work.**

## What Is It?

autofound.ai is a platform where founders build and run companies using AI agents as their workforce. You don't just get a chatbot — you get an org chart of specialized agents that talk to each other, delegate tasks, and execute real work.

Think of it as "founding a company" where your first hires are AI agents you configure, connect, and let loose.

---

## How It Works

### 1. You're the Founder
You bring your API keys (OpenAI, Anthropic, etc.) and your vision. autofound.ai gives you the infrastructure to build a functioning AI team.

### 2. Hire from Agent Templates
Browse a library of pre-built agent roles:

| Department | Agent Templates |
|---|---|
| **Executive** | CEO (strategy, oversight, delegation), COO (operations, processes) |
| **HR** | Agent Manager (spawn new agents, monitor performance, "fire" underperformers) |
| **Marketing** | Content Writer, SEO Specialist, Social Media Manager, Email Marketer |
| **Sales** | Lead Researcher, Outreach Agent, CRM Manager |
| **Finance** | Bookkeeper, Invoice Manager, Expense Tracker |
| **Legal** | Contract Drafter, Compliance Monitor |
| **Engineering** | Code Agent, QA Tester, DevOps |
| **Support** | Customer Support, Ticket Triager |

Each template comes with a system prompt, tool access, default behaviors, and suggested connections to other agents.

### 3. Define the Org Chart
Drag-and-drop org chart builder:
- **Who reports to whom** — CEO oversees department heads, department heads manage specialists
- **Communication channels** — which agents can talk to each other directly
- **Escalation paths** — when should an agent escalate to its manager vs. handle alone
- **Approval gates** — which actions need human (founder) approval

```
                    👤 You (Founder)
                         │
                    🤖 CEO Agent
                    ┌────┼────┐
               🤖 CMO    🤖 CFO    🤖 CTO
               ┌─┴─┐      │       ┌─┴─┐
          🤖 Writer  🤖 SEO  🤖 Books  🤖 Dev  🤖 QA
```

### 4. Agents Execute Real Work
These aren't advisors. They do the work:
- **Marketing agent** writes blog posts, schedules social media, runs SEO audits
- **Sales agent** researches leads, sends outreach emails, updates CRM
- **Finance agent** generates invoices, categorizes expenses, flags anomalies
- **HR agent** monitors agent performance, spawns new agents when workload increases
- **CEO agent** reviews department reports, sets priorities, delegates new tasks

### 5. Communication Rules
You define how agents interact:
- **Sync channels** — direct agent-to-agent messaging for coordination
- **Async reports** — daily/weekly summaries up the chain
- **Broadcast** — CEO can message all agents
- **Cross-department** — Marketing asks Sales for customer insights, etc.
- **Human-in-the-loop** — configurable approval gates before external actions

---

## Key Concepts

### Agent Hierarchy
Every agent has a **role**, a **manager**, and **direct reports**. The hierarchy determines:
- Who can assign tasks to whom
- Who gets escalations
- Who approves actions
- Information flow (need-to-know vs. broadcast)

### Communication Graph
Beyond hierarchy, you define a **communication graph** — which agents can talk directly. A content writer might talk to the SEO specialist without going through the CMO every time. You control the topology.

### Tool Access
Each agent gets specific tools based on their role:
- Marketing → web search, content CMS, social APIs, analytics
- Sales → email, CRM, LinkedIn, lead databases
- Finance → spreadsheets, invoicing, bank APIs
- Engineering → code execution, git, deployment
- All agents → internal messaging, task management

### Spawn & Scale
The HR agent (or any manager agent) can **spawn new agents** when workload demands it. Need 3 content writers instead of 1? HR spins them up with the right template and assigns them to the CMO.

### BYOK (Bring Your Own Keys)
Users provide their own API keys:
- LLM providers (OpenAI, Anthropic, Google, etc.)
- Tool integrations (email, CRM, social media, etc.)
- We never store or proxy API keys — they stay client-side or in user-encrypted vaults

---

## Differentiators

| autofound.ai | Other AI tools |
|---|---|
| Full org chart of collaborating agents | Single chatbot or single agent |
| Agents talk to each other autonomously | Human orchestrates every interaction |
| Hierarchical delegation & escalation | Flat, no structure |
| HR agent spawns/manages other agents | Manual agent creation |
| BYOK, no vendor lock-in | Locked to one provider |
| Real execution, not just advice | "Here's what you could do..." |

---

## Target Audience

### Primary
- **Solo founders** — need a team but can't afford one yet
- **Indie hackers** — want to scale operations without hiring
- **Agency owners** — run client work with AI teams per client

### Secondary
- **Small businesses** (2-10 people) — augment human team with AI departments
- **Consultants** — spin up project-specific AI teams
- **Educators/experimenters** — study multi-agent systems

---

## Revenue Model

autofound.ai is **free to start, pay for scale**:

| Tier | Price | Includes |
|---|---|---|
| **Starter** | Free | 3 agents, basic org chart, community templates |
| **Growth** | $29/mo | 15 agents, custom templates, advanced communication rules |
| **Business** | $79/mo | Unlimited agents, priority execution, API access, team collaboration |
| **Enterprise** | Custom | SSO, audit logs, dedicated support, custom integrations |

Revenue comes from the platform, not the AI — users bring their own keys.

---

## Tech Stack

- **Frontend**: Next.js + Tailwind CSS (app + marketing site)
- **Backend**: Convex (real-time agent state, org charts, message passing)
- **Agent Runtime**: Server-side agent orchestration (WebSocket-based communication)
- **Auth**: Clerk or NextAuth
- **Deployment**: Vercel (frontend) + fly.io or Railway (agent runtime)
- **Domain**: autofound.ai ✅

---

## MVP Scope (Phase 1)

**Goal:** One working org chart with 3-5 agents that actually collaborate.

1. **Org chart builder** — visual drag-and-drop, define hierarchy + communication rules
2. **3 starter templates** — CEO, Marketing Writer, SEO Specialist
3. **Agent messaging** — agents can send messages to each other based on the graph
4. **Task delegation** — CEO assigns tasks, workers execute and report back
5. **Human dashboard** — founder sees all agent activity, approves/rejects actions
6. **BYOK setup** — bring your Anthropic/OpenAI key, encrypted storage

### Phase 2
- Agent template marketplace (community-contributed)
- HR agent that spawns/manages agents dynamically
- Tool integrations (email, social, CRM)
- Scheduled agent shifts (cron-like)

### Phase 3
- Multi-user (invite your human co-founder)
- Client workspaces (agencies run one org per client)
- Agent performance analytics
- Mobile app for founder oversight

---

## The Meta

We're already living this product. OpenClaw + Bob = a CEO agent managing worker shifts, spawning subagents, running cron jobs across multiple projects. autofound.ai productizes this pattern for everyone.

The insight: **multi-agent collaboration with hierarchy beats single-agent chaos.** Structure matters. Org charts matter. Even for AI.
