"use client";

import { useState } from "react";
import { Plus, Play, Loader2 } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AgentRunViewer from "../../components/AgentRunViewer";
import { TASK_STATUS } from "@/lib/status";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  const { user: clerkUser, isLoaded } = useUser();
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

  const selectedTask = tasks?.find((t: any) => t._id === selectedTaskId);
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
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const filtered = !tasks ? [] : filter === "all" ? tasks : tasks.filter((t: any) => t.status === filter);
  const sortedTasks = [...filtered].sort((a: any, b: any) => b.createdAt - a.createdAt);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Tasks"
        subtitle={`${tasks?.length ?? 0} total · ${tasks?.filter((t: any) => t.status === "needs_approval").length ?? 0} awaiting approval`}
      >
        <Button onClick={() => setShowCreate(true)} disabled={!clerkId}>
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "pending", "running", "needs_approval", "completed", "failed"].map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(s)}
            className={filter === s ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 hover:text-blue-400" : "text-zinc-400"}
          >
            {s === "all" ? "All" : TASK_STATUS[s as keyof typeof TASK_STATUS]?.label}
          </Button>
        ))}
      </div>

      {/* Empty state */}
      {tasks && tasks.length === 0 && (
        <EmptyState
          title="No tasks yet. Create one to get started."
          action={{ label: "Create Your First Task", onClick: () => setShowCreate(true) }}
        />
      )}

      {/* Task list */}
      <div className="space-y-2">
        {sortedTasks.map((task) => {
          const sc = TASK_STATUS[task.status as keyof typeof TASK_STATUS];
          const isRunning = executing[task._id];
          const StatusIcon = sc?.icon;
          return (
            <div
              key={task._id}
              onClick={() => setSelectedTaskId(task._id)}
              className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer"
            >
              {isRunning || task.status === "running" ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
              ) : StatusIcon ? (
                <StatusIcon className={`w-5 h-5 ${sc.color} flex-shrink-0`} />
              ) : null}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{task.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(task.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {sc && (
                  <Badge variant="secondary" className={`${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </Badge>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{task.agentIcon}</span>
                  <span className="text-xs text-zinc-400">{task.agentName}</span>
                </div>
                {task.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleExecute(task._id); }}
                    disabled={isRunning}
                    className="text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 hover:text-blue-400"
                  >
                    <Play className="w-3 h-3" /> Run
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <AgentAvatar icon={selectedTask.agentIcon ?? ""} color="#3b82f6" size="md" />
                  <div>
                    <DialogTitle>{selectedTask.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedTask.agentName} · {new Date(selectedTask.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </DialogHeader>

              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}

              <div className="flex gap-2">
                {(() => {
                  const sc = TASK_STATUS[selectedTask.status as keyof typeof TASK_STATUS];
                  return sc ? (
                    <Badge variant="secondary" className={`${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </Badge>
                  ) : null;
                })()}
              </div>

              {selectedTaskRun && (
                <div>
                  <AgentRunViewer runId={selectedTaskRun._id} />
                </div>
              )}

              {selectedTask.output && !selectedTaskRun && (
                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">Agent Output</h3>
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{selectedTask.output}</pre>
                </div>
              )}

              <div className="flex gap-2">
                {selectedTask.status === "pending" && (
                  <Button
                    className="flex-1"
                    onClick={() => handleExecute(selectedTask._id)}
                    disabled={executing[selectedTask._id]}
                  >
                    {executing[selectedTask._id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Task
                  </Button>
                )}
                {selectedTask.status === "needs_approval" && (
                  <>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => handleApprove(selectedTask._id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedTaskId(null)}
                    >
                      Request Changes
                    </Button>
                  </>
                )}
                {selectedTask.status === "failed" && (
                  <Button
                    className="flex-1"
                    onClick={() => handleExecute(selectedTask._id)}
                    disabled={executing[selectedTask._id]}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create task dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Detailed instructions for the agent..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={newTask.agentId} onValueChange={(v) => setNewTask({ ...newTask, agentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((a: any) => (
                    <SelectItem key={a._id} value={a._id}>{a.icon} {a.name} — {a.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(!agents || agents.length === 0) && (
              <p className="text-xs text-amber-400">No agents yet. Create agents first in the Agents page.</p>
            )}
            <Button
              onClick={handleCreate}
              disabled={!newTask.title || !newTask.agentId || creating}
              className="w-full"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
