"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import AgentDetailPanel from "./_components/AgentDetailPanel";

const OfficeCanvas = dynamic(() => import("./_components/OfficeCanvas"), {
  ssr: false,
});

// Default zone positions by role keyword
const ZONE_DEFAULTS: Record<string, { x: number; z: number }> = {
  ceo: { x: -5, z: -5 },
  strategy: { x: -5.5, z: -4 },
  founder: { x: -4.5, z: -6 },
  marketing: { x: 5, z: -5 },
  content: { x: 5.5, z: -4 },
  sales: { x: 5, z: 5 },
  "business development": { x: 5.5, z: 6 },
  operations: { x: -5, z: 5 },
  ops: { x: -5.5, z: 6 },
};

function getDefaultPosition(
  role: string,
  index: number
): { x: number; z: number } {
  const lower = role.toLowerCase();
  for (const [key, pos] of Object.entries(ZONE_DEFAULTS)) {
    if (lower.includes(key)) {
      return { x: pos.x + (index % 3) * 1.5, z: pos.z + Math.floor(index / 3) * 1.5 };
    }
  }
  // Fallback: spread in center area
  const angle = (index / 6) * Math.PI * 2;
  return { x: Math.cos(angle) * 3, z: Math.sin(angle) * 3 };
}

export default function OfficePage() {
  const { user: clerkUser } = useUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(
    api.agents.listAgentsByClerk,
    clerkId ? { clerkId } : "skip"
  );
  const officeActivity = useQuery(
    api.agents.getOfficeActivity,
    clerkId ? { clerkId } : "skip"
  );
  const savedPositions = useQuery(
    api.orgChart.getPositionsByClerk,
    clerkId ? { clerkId } : "skip"
  );
  const savePositions = useMutation(api.orgChart.savePositionsByClerk);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build positions map: saved positions merged with defaults
  const [localPositions, setLocalPositions] = useState<
    Record<string, { x: number; z: number }>
  >({});
  const initializedRef = useRef(false);

  // Initialize positions once data loads
  useEffect(() => {
    if (!agents || !savedPositions || initializedRef.current) return;
    initializedRef.current = true;

    const savedMap: Record<string, { x: number; z: number }> = {};
    for (const p of savedPositions) {
      savedMap[p.nodeKey] = { x: p.x, z: p.y }; // DB y → Three.js z
    }

    const positions: Record<string, { x: number; z: number }> = {};
    agents.forEach((agent: Doc<"agents">, i: number) => {
      const id = agent._id as string;
      if (savedMap[id]) {
        positions[id] = savedMap[id];
      } else {
        positions[id] = getDefaultPosition(agent.role, i);
      }
    });

    setLocalPositions(positions);
  }, [agents, savedPositions]);

  // Debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const positionsRef = useRef(localPositions);
  positionsRef.current = localPositions;

  const persistPositions = useCallback(() => {
    if (!clerkId) return;
    const current = positionsRef.current;
    const posArray = Object.entries(current).map(([nodeKey, { x, z }]) => ({
      nodeKey,
      x,
      y: z, // Three.js z → DB y
    }));
    savePositions({ clerkId, positions: posArray }).catch(() => {});
  }, [clerkId, savePositions]);

  const handlePositionChange = useCallback(
    (agentId: string, x: number, z: number) => {
      setLocalPositions((prev) => ({ ...prev, [agentId]: { x, z } }));
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persistPositions, 500);
    },
    [persistPositions]
  );

  const selectedAgent = useMemo(
    () =>
      selectedId && agents
        ? agents.find((a: Doc<"agents">) => (a._id as string) === selectedId)
        : null,
    [selectedId, agents]
  );

  // Loading state
  if (!agents) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading office...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <OfficeCanvas
          agents={agents.map((a: Doc<"agents">) => ({
            _id: a._id as string,
            name: a.name,
            role: a.role,
            status: a.status,
            icon: a.icon,
            color: a.color,
            systemPrompt: a.systemPrompt,
          }))}
          positions={localPositions}
          activity={officeActivity ?? {}}
          selectedId={selectedId}
          onSelectAgent={setSelectedId}
          onPositionChange={handlePositionChange}
        />
      </div>

      {/* Detail panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={{
            _id: selectedAgent._id as string,
            name: selectedAgent.name,
            role: selectedAgent.role,
            status: selectedAgent.status,
            icon: selectedAgent.icon,
            color: selectedAgent.color,
            systemPrompt: selectedAgent.systemPrompt,
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
