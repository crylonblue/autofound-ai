"use client";

import { useState } from "react";
import { Plus, X, Clock, CheckCircle2, AlertCircle, Circle, Play, Loader2 } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AgentRunViewer from "../../components/AgentRunViewer";

function useClerkUser() {
  return useUser();
}

const statusConfig = {
  pending: { label: "Pending", icon: Circle, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  running: { label: "Running", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  needs_approval: { label: "Needs Approval", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function TasksPage() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const clerkId = clerkUser?.id ?? "";

  const tasks = useQuery(api.tasks.listTasksWithAgents, clerkId ? { clerkId } : "skip");
  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const createTask = useMutation(api.tasks.createTaskByClerk);
  const updateStatus = useMutation(api.tasks.updateTaskStatus);
  const executeTask = useAction(api.execute.executeTask);

  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", agentId: "", priority: "normal" });
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const selectedTask = tasks?.find((t) => t._id === selectedTaskId);
  const selectedTaskRun = useQuery(
    api.agentRuns.getRunByTask,
    selectedTaskId ? { taskId: selectedTaskId as Id<"tasks"> } : "skip"
  );

  const handleCreate = async () => {
    if (!newTask.title || !newTask.agentId || !clerkId) return;
    setCreating(true);
    try {
      await createTask({
        clerkId,
        agentId: newTask.agentId as Id<"agents">,
        title: newTask.title,
        description: newTask.description || undefined,
      });
      setNewTask({ title: "", description: "", agentId: "", priority: "normal" });
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleExecute = async (taskId: Id<"tasks">) => {
    if (!clerkId) return;
    setExecuting((e) => ({ ...e, [taskId]: true }));
    try {
      await executeTask({ taskId, clerkId });
    } finally {
      setExecuting((e) => ({ ...e, [taskId]: false }));
    }
  };

  const handleApprove = async (taskId: Id<"tasks">) => {
    await updateStatus({ taskId, status: "completed" });
    setSelectedTaskId(null);
  };

  if (!isLoaded) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const filtered = !tasks ? [] : filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const sortedTasks = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {tasks?.length ?? 0} total · {tasks?.filter((t) => t.status === "needs_approval").length ?? 0} awaiting approval
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!clerkId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "pending", "running", "needs_approval", "completed", "failed"].map((s) => (
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

      {/* Empty state */}
      {tasks && tasks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm mb-4">No tasks yet. Create one to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500">
            Create Your First Task
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {sortedTasks.map((task) => {
          const sc = statusConfig[task.status];
          const isRunning = executing[task._id];
          return (
            <div
              key={task._id}
              onClick={() => setSelectedTaskId(task._id)}
              className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer"
            >
              {isRunning || task.status === "running" ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
              ) : (
                <sc.icon className={`w-5 h-5 ${sc.color} flex-shrink-0`} />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{task.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{new Date(task.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{task.agentIcon}</span>
                  <span className="text-xs text-zinc-400">{task.agentName}</span>
                </div>
                {task.status === "pending" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExecute(task._id); }}
                    disabled={isRunning}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs hover:bg-blue-600/30 transition-colors"
                  >
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTask.agentIcon}</span>
                <div>
                  <h2 className="font-bold">{selectedTask.title}</h2>
                  <p className="text-xs text-zinc-500">{selectedTask.agentName} · {new Date(selectedTask.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
            </div>

            {selectedTask.description && (
              <p className="text-sm text-zinc-400 mb-4">{selectedTask.description}</p>
            )}

            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[selectedTask.status].bg} ${statusConfig[selectedTask.status].color}`}>
                {statusConfig[selectedTask.status].label}
              </span>
            </div>

            {selectedTaskRun && (
              <div className="mb-4">
                <AgentRunViewer runId={selectedTaskRun._id} />
              </div>
            )}

            {selectedTask.output && !selectedTaskRun && (
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4 mb-4">
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">Agent Output</h3>
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{selectedTask.output}</pre>
              </div>
            )}

            <div className="flex gap-2">
              {selectedTask.status === "pending" && (
                <button
                  onClick={() => handleExecute(selectedTask._id)}
                  disabled={executing[selectedTask._id]}
                  className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {executing[selectedTask._id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Task
                </button>
              )}
              {selectedTask.status === "needs_approval" && (
                <>
                  <button
                    onClick={() => handleApprove(selectedTask._id)}
                    className="flex-1 py-2 bg-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
                  >
                    Request Changes
                  </button>
                </>
              )}
              {(selectedTask.status === "completed" || selectedTask.status === "failed") && selectedTask.status === "failed" && (
                <button
                  onClick={() => handleExecute(selectedTask._id)}
                  disabled={executing[selectedTask._id]}
                  className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Retry
                </button>
              )}
            </div>
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
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Assign to</label>
                <select
                  value={newTask.agentId}
                  onChange={(e) => setNewTask({ ...newTask, agentId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Select agent...</option>
                  {agents?.map((a) => (
                    <option key={a._id} value={a._id}>{a.icon} {a.name} — {a.role}</option>
                  ))}
                </select>
              </div>
              {(!agents || agents.length === 0) && (
                <p className="text-xs text-amber-400">No agents yet. Create agents first in the Agents page.</p>
              )}
              <button
                onClick={handleCreate}
                disabled={!newTask.title || !newTask.agentId || creating}
                className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
