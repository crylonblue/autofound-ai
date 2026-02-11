"use client";

import { useState } from "react";
import { Plus, X, Clock, CheckCircle2, AlertCircle, Circle, ArrowUpDown } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeIcon: string;
  status: "pending" | "in_progress" | "needs_approval" | "completed" | "failed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  output?: string;
};

const demoTasks: Task[] = [
  { id: "1", title: "Write weekly blog post about AI trends", description: "Research and write a 1500-word blog post on the latest AI trends in 2026.", assignee: "Content Writer", assigneeIcon: "✍️", status: "in_progress", priority: "high", createdAt: "2 hours ago" },
  { id: "2", title: "Keyword research for Q1 content calendar", description: "Identify top 20 keywords for our niche with search volume and difficulty.", assignee: "SEO Specialist", assigneeIcon: "🔍", status: "pending", priority: "normal", createdAt: "3 hours ago" },
  { id: "3", title: "Review Q4 financial summary", description: "Compile and review all Q4 expenses, revenue, and margins.", assignee: "CEO Agent", assigneeIcon: "👔", status: "needs_approval", priority: "urgent", createdAt: "5 hours ago", output: "Q4 Revenue: €45,200 (+12% QoQ)\nExpenses: €31,800\nNet Margin: 29.6%\nKey insight: Marketing spend ROI improved 3x after blog launch." },
  { id: "4", title: "Optimize homepage meta descriptions", description: "Update meta titles and descriptions for all main pages.", assignee: "SEO Specialist", assigneeIcon: "🔍", status: "completed", priority: "normal", createdAt: "1 day ago", output: "Updated 8 pages with optimized meta tags. Average title length: 58 chars. All descriptions under 160 chars." },
  { id: "5", title: "Draft outreach email templates", description: "Create 3 cold outreach email templates for potential partners.", assignee: "Content Writer", assigneeIcon: "✍️", status: "completed", priority: "low", createdAt: "2 days ago" },
];

const statusConfig = {
  pending: { label: "Pending", icon: Circle, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  needs_approval: { label: "Needs Approval", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

const priorityConfig = {
  low: { color: "text-zinc-400", bg: "bg-zinc-500/10" },
  normal: { color: "text-blue-400", bg: "bg-blue-500/10" },
  high: { color: "text-amber-400", bg: "bg-amber-500/10" },
  urgent: { color: "text-red-400", bg: "bg-red-500/10" },
};

const agents = [
  { name: "CEO Agent", icon: "👔" },
  { name: "Content Writer", icon: "✍️" },
  { name: "SEO Specialist", icon: "🔍" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", assignee: "", priority: "normal" as Task["priority"] });

  const createTask = () => {
    if (!newTask.title || !newTask.assignee) return;
    const agent = agents.find(a => a.name === newTask.assignee);
    const task: Task = {
      id: String(Date.now()),
      title: newTask.title,
      description: newTask.description,
      assignee: newTask.assignee,
      assigneeIcon: agent?.icon || "🤖",
      status: "pending",
      priority: newTask.priority,
      createdAt: "Just now",
    };
    setTasks([task, ...tasks]);
    setNewTask({ title: "", description: "", assignee: "", priority: "normal" });
    setShowCreate(false);
  };

  const approveTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: "completed" as const } : t));
    setSelectedTask(null);
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-zinc-400 text-sm mt-1">{tasks.length} total · {tasks.filter(t => t.status === "needs_approval").length} awaiting approval</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "pending", "in_progress", "needs_approval", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            {s === "all" ? "All" : statusConfig[s as keyof typeof statusConfig]?.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task) => {
          const sc = statusConfig[task.status];
          const pc = priorityConfig[task.priority];
          return (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer"
            >
              <sc.icon className={`w-5 h-5 ${sc.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{task.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{task.createdAt}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>
                  {task.priority}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{task.assigneeIcon}</span>
                  <span className="text-xs text-zinc-400">{task.assignee}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTask.assigneeIcon}</span>
                <div>
                  <h2 className="font-bold">{selectedTask.title}</h2>
                  <p className="text-xs text-zinc-500">{selectedTask.assignee} · {selectedTask.createdAt}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-zinc-400 mb-4">{selectedTask.description}</p>

            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[selectedTask.status].bg} ${statusConfig[selectedTask.status].color}`}>
                {statusConfig[selectedTask.status].label}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[selectedTask.priority].bg} ${priorityConfig[selectedTask.priority].color}`}>
                {selectedTask.priority}
              </span>
            </div>

            {selectedTask.output && (
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4 mb-4">
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">Agent Output</h3>
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{selectedTask.output}</pre>
              </div>
            )}

            {selectedTask.status === "needs_approval" && (
              <div className="flex gap-2">
                <button
                  onClick={() => approveTask(selectedTask.id)}
                  className="flex-1 py-2 bg-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  Request Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Create Task</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detailed instructions for the agent..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Assign to</label>
                  <select
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Select agent...</option>
                    {agents.map(a => (
                      <option key={a.name} value={a.name}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <button
                onClick={createTask}
                disabled={!newTask.title || !newTask.assignee}
                className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
