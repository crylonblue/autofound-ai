"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  Node,
  Edge,
  NodeProps,
  NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Save, Loader2, Check } from "lucide-react";

// Custom agent node
function AgentNode({ data }: NodeProps) {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-[#111]" />
      <div
        className="bg-[#111] border-2 rounded-xl px-5 py-4 min-w-[160px] text-center shadow-xl transition-all hover:shadow-blue-500/10"
        style={{ borderColor: data.color + "60" }}
      >
        <div className="text-2xl mb-1">{data.icon}</div>
        <div className="font-semibold text-sm text-white">{data.label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{data.role}</div>
        <div className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          data.status === "active"
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-zinc-500/10 text-zinc-400"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${data.status === "active" ? "bg-emerald-400" : "bg-zinc-500"}`} />
          {data.status}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-[#111]" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export default function OrgChartPage() {
  const { user } = useUser();
  const clerkId = user?.id;

  // Convex queries
  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const connections = useQuery(api.orgChart.getConnectionsByClerk, clerkId ? { clerkId } : "skip");
  const positions = useQuery(api.orgChart.getPositionsByClerk, clerkId ? { clerkId } : "skip");

  // Convex mutations
  const saveConnections = useMutation(api.orgChart.saveConnectionsByClerk);
  const savePositions = useMutation(api.orgChart.savePositionsByClerk);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Build nodes from agents + founder node when data loads
  useEffect(() => {
    if (!agents || !connections || !positions) return;
    if (initialized) return;

    const posMap = new Map<string, { x: number; y: number }>();
    for (const p of positions) {
      posMap.set(p.nodeKey, { x: p.x, y: p.y });
    }

    const founderPos = posMap.get("founder") ?? { x: 400, y: 0 };
    const flowNodes: Node[] = [
      {
        id: "founder",
        type: "agent",
        position: founderPos,
        data: { label: "You", role: "Founder", icon: "👤", color: "#ffffff", status: "active" },
      },
    ];

    agents.forEach((agent, i) => {
      const defaultPos = { x: 150 + (i % 4) * 200, y: 150 + Math.floor(i / 4) * 170 };
      const pos = posMap.get(agent._id) ?? defaultPos;
      flowNodes.push({
        id: agent._id,
        type: "agent",
        position: pos,
        data: {
          label: agent.name,
          role: agent.role,
          icon: agent.icon,
          color: agent.color,
          status: agent.status,
        },
      });
    });

    const flowEdges: Edge[] = connections.map((conn) => ({
      id: `e-${conn.parentAgentId}-${conn.childAgentId}`,
      source: conn.parentAgentId,
      target: conn.childAgentId,
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    }));

    // If no connections saved yet, auto-connect founder to all agents
    if (connections.length === 0 && agents.length > 0) {
      agents.forEach((agent) => {
        flowEdges.push({
          id: `e-founder-${agent._id}`,
          source: "founder",
          target: agent._id,
          animated: true,
          style: { stroke: agent.color + "80", strokeWidth: 2 },
        });
      });
    }

    setNodes(flowNodes);
    setEdges(flowEdges);
    setInitialized(true);
  }, [agents, connections, positions, initialized, setNodes, setEdges]);

  // Track dirty state on node/edge changes after init
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (initialized) setDirty(true);
    },
    [onNodesChange, initialized]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          },
          eds
        )
      );
      setDirty(true);
    },
    [setEdges]
  );

  const handleSave = useCallback(async () => {
    if (!clerkId) return;
    setSaving(true);
    try {
      // Extract connections from edges (skip edges involving "founder" as parent — founder isn't an agent ID)
      const conns = edges
        .filter((e) => e.source !== "founder" && e.target !== "founder")
        .map((e) => ({
          parentAgentId: e.source as Id<"agents">,
          childAgentId: e.target as Id<"agents">,
        }));

      // For founder connections, we store them too — use a special convention:
      // edges FROM founder → target means the founder oversees that agent
      // We'll skip these in orgConnections (founder isn't an agent) 
      // but we could model them via reportsTo on agents instead.
      // For now, save only agent-to-agent connections.
      
      await saveConnections({ clerkId, connections: conns });

      // Save positions
      const posArr = nodes.map((n) => ({
        nodeKey: n.id,
        x: n.position.x,
        y: n.position.y,
      }));
      await savePositions({ clerkId, positions: posArr });

      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save org chart:", err);
    } finally {
      setSaving(false);
    }
  }, [clerkId, edges, nodes, saveConnections, savePositions]);

  // Loading state
  if (!agents || !connections || !positions) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🏗️</p>
          <h2 className="text-lg font-semibold mb-1">No agents yet</h2>
          <p className="text-sm text-zinc-500">
            <a href="/agents" className="text-blue-400 hover:underline">Hire some agents</a> first, then organize them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h1 className="text-lg font-bold">Org Chart</h1>
          <p className="text-xs text-zinc-500">Drag agents to reposition · Connect by dragging handles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? "bg-emerald-600 text-white"
                : dirty
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-white/5 border border-white/10 text-zinc-500 cursor-default"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={(changes) => { onEdgesChange(changes); if (initialized) setDirty(true); }}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#0a0a0a]"
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          }}
        >
          <Background color="#ffffff08" gap={20} />
          <Controls className="!bg-[#111] !border-white/10 !rounded-lg [&>button]:!bg-[#111] [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-white/10" />
          <MiniMap
            className="!bg-[#111] !border-white/10 !rounded-lg"
            nodeColor={(n) => n.data?.color || "#3b82f6"}
            maskColor="rgba(0,0,0,0.8)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
