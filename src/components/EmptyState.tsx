import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon | string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {Icon && (
        typeof Icon === "string" ? (
          <p className="text-4xl mb-4">{Icon}</p>
        ) : (
          <Icon className="w-8 h-8 mx-auto mb-4 text-zinc-600" />
        )
      )}
      <p className="text-muted-foreground text-sm mb-4">{title}</p>
      {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
