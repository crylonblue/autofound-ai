import {
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Square,
  CircleDot,
  Loader2,
  Heart,
  MessageSquare,
  Zap,
  AlertTriangle,
} from "lucide-react";

export const TASK_STATUS = {
  pending: { label: "Pending", icon: Circle, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  running: { label: "Running", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  needs_approval: { label: "Needs Approval", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
} as const;

export const RUN_STATUS = {
  queued: { label: "Queued", icon: Clock, color: "text-zinc-400", bg: "bg-zinc-500/20", pulse: false },
  starting: { label: "Starting", icon: CircleDot, color: "text-yellow-400", bg: "bg-yellow-500/20", pulse: false },
  running: { label: "Running", icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/20", pulse: true },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20", pulse: false },
  failed: { label: "Failed", icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", pulse: false },
  cancelled: { label: "Cancelled", icon: Square, color: "text-zinc-400", bg: "bg-zinc-500/20", pulse: false },
} as const;

export const ACTIVITY_TYPE = {
  heartbeat_complete: { label: "Heartbeat", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  task_complete: { label: "Task Done", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  task_failed: { label: "Task Failed", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  chat_response: { label: "Chat", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  proactive_action: { label: "Proactive", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  error: { label: "Error", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
} as const;
