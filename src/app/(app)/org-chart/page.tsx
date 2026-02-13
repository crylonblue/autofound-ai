"use client";

import { useState, useCallback } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Save } from "lucide-react";

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

// Founder node at the top
const founderNode: Node = {
  id: "founder",
  type: "agent",
  position: { x: 400, y: 0 },
  data: { label: "You", role: "Founder", icon: "👤", color: "#ffffff", status: "active" },
};

const initialNodes: Node[] = [
  founderNode,
  {
    id: "ceo",
    type: "agent",
    position: { x: 400, y: 150 },
    data: { label: "CEO Agent", role: "CEO", icon: "👔", color: "#3b82f6", status: "active" },
  },
  {
    id: "writer",
    type: "agent",
    position: { x: 150, y: 320 },
    data: { label: "Content Writer", role: "Writer", icon: "✍️", color: "#8b5cf6", status: "active" },
  },
  {
    id: "seo",
    type: "agent",
    position: { x: 650, y: 320 },
    data: { label: "SEO Specialist", role: "SEO", icon: "🔍", color: "#10b981", status: "active" },
  },
];

const initialEdges: Edge[] = [
  { id: "e-founder-ceo", source: "founder", target: "ceo", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e-ceo-writer", source: "ceo", target: "writer", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
  { id: "e-ceo-seo", source: "ceo", target: "seo", animated: true, style: { stroke: "#10b981", strokeWidth: 2 } },
  { id: "e-writer-seo", source: "writer", target: "seo", type: "default", style: { stroke: "#ffffff20", strokeWidth: 1, strokeDasharray: "5 5" }, label: "peers" },
];

const agentTemplates = [
  { name: "Developer", role: "Developer", icon: "💻", color: "#f59e0b", department: "engineering" },
  { name: "Sales Agent", role: "Sales", icon: "🤝", color: "#ef4444", department: "sales" },
  { name: "Bookkeeper", role: "Finance", icon: "📊", color: "#06b6d4", department: "finance" },
  { name: "HR Manager", role: "HR", icon: "👥", color: "#ec4899", department: "hr" },
  { name: "Customer Support", role: "Support", icon: "💬", color: "#14b8a6", department: "support" },
];

export default function OrgChartPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addAgent = (template: typeof agentTemplates[0]) => {
    const newNode: Node = {
      id: `agent-${Date.now()}`,
      type: "agent",
      position: { x: 200 + Math.random() * 400, y: 300 + Math.random() * 200 },
      data: {
        label: template.name,
        role: template.role,
        icon: template.icon,
        color: template.color,
        status: "active",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowAddPanel(false);
  };

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
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Add agent panel */}
      {showAddPanel && (
        <div className="absolute top-20 right-4 z-20 bg-[#111] border border-white/10 rounded-xl p-4 w-64 shadow-2xl">
          <h3 className="font-semibold text-sm mb-3">Add Agent</h3>
          <div className="space-y-2">
            {agentTemplates.map((t) => (
              <button
                key={t.name}
                onClick={() => addAgent(t)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-lg">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.department}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
