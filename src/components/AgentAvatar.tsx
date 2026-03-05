import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-7 h-7 text-sm",
  md: "w-10 h-10 text-xl",
  lg: "w-16 h-16 text-3xl rounded-2xl",
};

export function AgentAvatar({ icon, color, size = "md", className }: AgentAvatarProps) {
  return (
    <div
      className={cn("rounded-lg flex items-center justify-center", sizes[size], className)}
      style={{ backgroundColor: color + "20" }}
    >
      {icon}
    </div>
  );
}
