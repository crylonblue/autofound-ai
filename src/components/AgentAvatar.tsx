"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const MODEL_LABELS: Record<string, string> = {
  ceo: "E",
  marketing: "C",
  sales: "P",
  dev: "T",
};

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

const fontSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-base",
};

export function AgentAvatar({ icon, color, size = "md", className }: AgentAvatarProps) {
  const isModel = icon in MODEL_LABELS;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn("rounded-lg flex items-center justify-center overflow-hidden", sizes[size], className)}
      style={{ backgroundColor: color + "20" }}
    >
      {isModel ? (
        imgError ? (
          <span className={cn("font-bold", fontSizes[size])} style={{ color }}>
            {MODEL_LABELS[icon]}
          </span>
        ) : (
          <img
            src={`/models/${icon}-thumb.png`}
            alt={icon}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )
      ) : (
        icon
      )}
    </div>
  );
}
