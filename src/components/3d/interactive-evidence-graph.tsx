"use client";

import React, { useState, useMemo, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import {
  Network,
  Search,
  CheckCircle2,
  List,
  ArrowRight,
} from "lucide-react";

export type GraphViewMode =
  | "full"
  | "buyer_trace"
  | "merchant_trace"
  | "conflicts_gaps"
  | "replay";

export interface GraphNode {
  id: string;
  name: string;
  entityType:
    | "Buyer"
    | "Merchant"
    | "Purchase"
    | "Product"
    | "Order"
    | "Transaction"
    | "Payment"
    | "Invoice"
    | "Delivery"
    | "Evidence"
    | "AIFinding"
    | "Investigation"
    | "Resolution";
  source: "buyer" | "merchant" | "payment" | "ai" | "system";
  position: [number, number, number];
  color: string;
  hash: string;
  timestamp: string;
  confidence: number;
  description: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: "buyer" | "merchant" | "payment" | "contradiction" | "consensus";
}

const GRAPH_NODES: GraphNode[] = [
  {
    id: "buyer",
    name: "Alex Morgan",
    entityType: "Buyer",
    source: "buyer",
    position: [-3.2, 1.4, 0.4],
    color: "#4C91C8",
    hash: "sha256:8f4b...3a1c",
    timestamp: "2026-01-14 14:22:08 UTC",
    confidence: 1.0,
    description: "Verified buyer identity with 3D Secure authenticated card credentials.",
  },
  {
    id: "merchant",
    name: "Apex Tech Labs Ltd",
    entityType: "Merchant",
    source: "merchant",
    position: [3.2, -1.2, 0.4],
    color: "#388F7D",
    hash: "sha256:2d1e...99bb",
    timestamp: "2026-01-14 09:15:30 UTC",
    confidence: 1.0,
    description: "Verified enterprise merchant organization with automated warehouse API integration.",
  },
  {
    id: "purchase",
    name: "Purchase Agreement",
    entityType: "Purchase",
    source: "payment",
    position: [-1.8, 2.0, -0.4],
    color: "#C18B45",
    hash: "sha256:e1a2...7701",
    timestamp: "2026-01-14 09:30:12 UTC",
    confidence: 1.0,
    description: "Purchase order terms specifying 2-year warranty and signature upon receipt.",
  },
  {
    id: "product",
    name: "NVMe 2TB Enterprise SSD",
    entityType: "Product",
    source: "merchant",
    position: [1.8, -2.0, -0.4],
    color: "#388F7D",
    hash: "sha256:44aa...bc19",
    timestamp: "2026-01-14 09:16:00 UTC",
    confidence: 1.0,
    description: "SKU #SSD-ENT-2000 with recorded serial #SN-881290-NVME.",
  },
  {
    id: "order",
    name: "Order #ORD-2026-4412",
    entityType: "Order",
    source: "payment",
    position: [-0.8, 1.5, 0.2],
    color: "#C18B45",
    hash: "sha256:77bb...0012",
    timestamp: "2026-01-14 09:30:45 UTC",
    confidence: 1.0,
    description: "E-commerce order record containing item price, taxes, and shipping destination.",
  },
  {
    id: "transaction",
    name: "Gateway Auth #TX-9812",
    entityType: "Transaction",
    source: "payment",
    position: [0.8, 1.5, -0.2],
    color: "#C18B45",
    hash: "sha256:90aa...5510",
    timestamp: "2026-01-14 09:31:02 UTC",
    confidence: 1.0,
    description: "Card authorization via PayPal / Stripe Gateway. Settlement locked in escrow.",
  },
  {
    id: "payment",
    name: "Captured $1,420.00 USD",
    entityType: "Payment",
    source: "payment",
    position: [0, 2.3, 0],
    color: "#C18B45",
    hash: "sha256:cc12...ee88",
    timestamp: "2026-01-14 09:31:10 UTC",
    confidence: 1.0,
    description: "Verified minor-unit settlement value: 142000 USD cents.",
  },
  {
    id: "invoice",
    name: "Invoice #INV-APEX-8812",
    entityType: "Invoice",
    source: "merchant",
    position: [2.2, 0.8, -0.3],
    color: "#388F7D",
    hash: "sha256:11dd...4422",
    timestamp: "2026-01-14 09:40:00 UTC",
    confidence: 1.0,
    description: "Tax invoice signed cryptographically by merchant corporate credentials.",
  },
  {
    id: "delivery",
    name: "DHL Express #TRK-9801",
    entityType: "Delivery",
    source: "merchant",
    position: [1.8, 0, 0.4],
    color: "#388F7D",
    hash: "sha256:55ef...7788",
    timestamp: "2026-01-16 11:20:00 UTC",
    confidence: 0.95,
    description: "Courier tracking manifest with origin weight 1,248g and Hub #3 handoff.",
  },
  {
    id: "evidence",
    name: "Unboxing Video & Scale Photo",
    entityType: "Evidence",
    source: "buyer",
    position: [-1.8, 0, 0.4],
    color: "#4C91C8",
    hash: "sha256:ff00...8811",
    timestamp: "2026-01-16 14:35:00 UTC",
    confidence: 0.98,
    description: "4K video recording unboxing session: re-taped seal, delivered weight 420g.",
  },
  {
    id: "ai_finding",
    name: "BERR Weight Contradiction",
    entityType: "AIFinding",
    source: "ai",
    position: [0, 0, 0.5],
    color: "#8875B5",
    hash: "sha256:7733...9900",
    timestamp: "2026-01-16 14:40:12 UTC",
    confidence: 0.96,
    description: "Deterministic analysis: -828g loss localized to carrier intermediate Sorting Hub #3.",
  },
  {
    id: "investigation",
    name: "Case Run #RG-2026-0412",
    entityType: "Investigation",
    source: "system",
    position: [0, -1.3, 0],
    color: "#BC7355",
    hash: "sha256:8899...0011",
    timestamp: "2026-01-16 14:45:00 UTC",
    confidence: 1.0,
    description: "Active bilateral dispute file with multi-tenant permissions intact.",
  },
  {
    id: "resolution",
    name: "Indemnity Settlement",
    entityType: "Resolution",
    source: "system",
    position: [0, -2.4, 0.3],
    color: "#378D70",
    hash: "sha256:3344...7766",
    timestamp: "2026-01-16 16:00:00 UTC",
    confidence: 1.0,
    description: "Human-authorized dual remedy: Buyer refunded, merchant compensated via carrier claims.",
  },
];

const GRAPH_EDGES: GraphEdge[] = [
  { id: "e1", sourceId: "buyer", targetId: "order", label: "placed", type: "buyer" },
  { id: "e2", sourceId: "order", targetId: "transaction", label: "authenticated", type: "payment" },
  { id: "e3", sourceId: "transaction", targetId: "payment", label: "settled", type: "payment" },
  { id: "e4", sourceId: "merchant", targetId: "invoice", label: "issued", type: "merchant" },
  { id: "e5", sourceId: "invoice", targetId: "product", label: "fulfills", type: "merchant" },
  { id: "e6", sourceId: "product", targetId: "delivery", label: "dispatched", type: "merchant" },
  { id: "e7", sourceId: "buyer", targetId: "evidence", label: "uploaded", type: "buyer" },
  { id: "e8", sourceId: "delivery", targetId: "ai_finding", label: "compared_against", type: "contradiction" },
  { id: "e9", sourceId: "evidence", targetId: "ai_finding", label: "compared_against", type: "contradiction" },
  { id: "e10", sourceId: "ai_finding", targetId: "investigation", label: "compiled_into", type: "consensus" },
  { id: "e11", sourceId: "investigation", targetId: "resolution", label: "approved_by_operator", type: "consensus" },
];

/** 3D Edge Line using stable THREE.Line */
function EdgeLine({
  sourceNode,
  targetNode,
  color,
  highlighted,
}: {
  sourceNode: GraphNode;
  targetNode: GraphNode;
  color: string;
  highlighted: boolean;
}) {
  const lineObj = useMemo(() => {
    const p1 = new THREE.Vector3(...sourceNode.position);
    const p2 = new THREE.Vector3(...targetNode.position);
    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const material = new THREE.LineBasicMaterial({
      color: highlighted ? "#FFFFFF" : color,
      transparent: true,
      opacity: highlighted ? 0.9 : 0.35,
      linewidth: highlighted ? 2 : 1,
    });
    return new THREE.Line(geometry, material);
  }, [sourceNode.position, targetNode.position, color, highlighted]);

  return <primitive object={lineObj} />;
}

/** 3D Node Sphere */
function NodeSphere({
  node,
  selected,
  highlighted,
  onClick,
}: {
  node: GraphNode;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = selected ? 1.3 : highlighted ? 1.15 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={selected ? 0.8 : highlighted ? 0.5 : 0.25}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Outermost selection ring */}
      {selected && (
        <mesh>
          <torusGeometry args={[0.34, 0.02, 16, 32]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      )}
    </group>
  );
}

/** High-Performance Screen-Space Projector for HTML Node Labels (React 19 Safe) */
function NodeLabelProjector() {
  const tempVec = useRef(new THREE.Vector3()).current;

  useFrame(({ camera, size }) => {
    if (typeof document === "undefined") return;
    const container = document.getElementById("evidence-graph-labels");
    if (!container) return;

    for (let i = 0; i < GRAPH_NODES.length; i++) {
      const node = GRAPH_NODES[i];
      const el = container.querySelector<HTMLButtonElement>(`[data-node-id="${node.id}"]`);
      if (!el) continue;

      tempVec.set(node.position[0], node.position[1] + 0.34, node.position[2]);
      tempVec.project(camera);

      // Check if behind camera
      if (tempVec.z >= 1) {
        if (el.style.display !== "none") el.style.display = "none";
        continue;
      }

      const x = (tempVec.x * 0.5 + 0.5) * size.width;
      const y = (-(tempVec.y * 0.5) + 0.5) * size.height;

      // Check bounds
      if (x < -100 || x > size.width + 100 || y < -40 || y > size.height + 40) {
        if (el.style.display !== "none") el.style.display = "none";
        continue;
      }

      if (el.style.display !== "block") el.style.display = "block";
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

/** 3D Canvas Content */
function GraphSceneContent({
  activeNodeIds,
  selectedNode,
  setSelectedNode,
}: {
  activeNodeIds: Set<string>;
  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 8, 6]} intensity={1.5} />
      <pointLight position={[-6, -6, -4]} intensity={0.8} color="#4C91C8" />

      {/* Screen-space position projector */}
      <NodeLabelProjector />

      {/* Render Edges */}
      {GRAPH_EDGES.map((edge) => {
        const s = GRAPH_NODES.find((n) => n.id === edge.sourceId);
        const t = GRAPH_NODES.find((n) => n.id === edge.targetId);
        if (!s || !t) return null;

        const isHighlighted =
          (selectedNode?.id === s.id || selectedNode?.id === t.id) ||
          (activeNodeIds.has(s.id) && activeNodeIds.has(t.id));

        return (
          <EdgeLine
            key={edge.id}
            sourceNode={s}
            targetNode={t}
            color={s.color}
            highlighted={isHighlighted}
          />
        );
      })}

      {/* Render Nodes */}
      {GRAPH_NODES.map((node) => {
        const isSelected = selectedNode?.id === node.id;
        const isHighlighted = activeNodeIds.has(node.id);

        return (
          <NodeSphere
            key={node.id}
            node={node}
            selected={isSelected}
            highlighted={isHighlighted}
            onClick={() => setSelectedNode(node)}
          />
        );
      })}
    </>
  );
}

/** Main Exported Interactive Evidence Graph Component */
export function InteractiveEvidenceGraph() {
  const [viewMode, setViewMode] = useState<GraphViewMode>("full");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(GRAPH_NODES[10]); // Default to BERR Weight Contradiction
  const [searchQuery, setSearchQuery] = useState("");
  const [render2DFallback, setRender2DFallback] = useState(false);

  // Determine highlighted nodes based on viewMode and search
  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      GRAPH_NODES.forEach((n) => {
        if (n.name.toLowerCase().includes(q) || n.entityType.toLowerCase().includes(q)) {
          ids.add(n.id);
        }
      });
      return ids;
    }

    switch (viewMode) {
      case "buyer_trace":
        ["buyer", "order", "evidence", "ai_finding"].forEach((id) => ids.add(id));
        break;
      case "merchant_trace":
        ["merchant", "invoice", "product", "delivery", "ai_finding"].forEach((id) => ids.add(id));
        break;
      case "conflicts_gaps":
        ["evidence", "delivery", "ai_finding", "investigation"].forEach((id) => ids.add(id));
        break;
      case "replay":
        ["purchase", "transaction", "payment", "delivery", "evidence", "ai_finding", "resolution"].forEach((id) => ids.add(id));
        break;
      default:
        GRAPH_NODES.forEach((n) => ids.add(n.id));
        break;
    }
    return ids;
  }, [viewMode, searchQuery]);

  return (
    <section className="relative border-b border-[var(--line)] bg-[var(--bg)] py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
              <Network className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>3D INTERACTIVE EVIDENCE GRAPH</span>
              <span className="text-[var(--ink-3)]">· Real Case RG-0412</span>
            </div>

            <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
              Navigate the relationship web
              <span className="block font-display italic text-[var(--accent)] font-medium">
                between claims, orders, and courier scales.
              </span>
            </h2>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
              Every participant, transaction auth, courier weigh-in, and tamper seal forms a connected node. Click any entity to inspect cryptographic SHA-256 hashes and timestamp provenance.
            </p>
          </div>

          {/* Action Bar: Search, View Mode Tabs & 2D Table Switch */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-3)]" />
              <input
                type="text"
                placeholder="Filter entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-8 pr-3 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setRender2DFallback((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
            >
              {render2DFallback ? <Network className="h-3.5 w-3.5 text-[var(--accent)]" /> : <List className="h-3.5 w-3.5" />}
              <span>{render2DFallback ? "Switch to 3D View" : "Accessible 2D View"}</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs Strip */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-4">
          <span className="font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider mr-2">
            View Modes:
          </span>

          <button
            onClick={() => setViewMode("full")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "full"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--surface-2)]"
            }`}
          >
            1. Full Graph
          </button>

          <button
            onClick={() => setViewMode("buyer_trace")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "buyer_trace"
                ? "bg-[var(--buyer)] text-white"
                : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--surface-2)]"
            }`}
          >
            2. Buyer Claim Trace
          </button>

          <button
            onClick={() => setViewMode("merchant_trace")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "merchant_trace"
                ? "bg-[var(--merchant)] text-white"
                : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--surface-2)]"
            }`}
          >
            3. Merchant Evidence Trace
          </button>

          <button
            onClick={() => setViewMode("conflicts_gaps")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "conflicts_gaps"
                ? "bg-[var(--amber)] text-white"
                : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--surface-2)]"
            }`}
          >
            4. Conflicts & Gaps
          </button>

          <button
            onClick={() => setViewMode("replay")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "replay"
                ? "bg-[var(--ai)] text-white"
                : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--surface-2)]"
            }`}
          >
            5. Investigation Replay
          </button>
        </div>

        {/* Main Graph Viewport Container */}
        <div className="mt-6 grid grid-cols-12 gap-6 items-stretch">
          {/* Main 3D Viewport or 2D Table */}
          <div className="col-span-12 lg:col-span-8 relative h-[500px] sm:h-[580px] rounded-3xl border border-[var(--line-strong)] bg-[var(--surface-2)]/30 overflow-hidden shadow-xl">
            {/* Background grid */}
            <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:24px_24px]" />

            {!render2DFallback ? (
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[var(--ink-3)]">
                    Loading 3D Evidence Network...
                  </div>
                }
              >
                <Canvas
                  camera={{ position: [0, 0, 7], fov: 48 }}
                  gl={{ antialias: true, alpha: true }}
                  className="h-full w-full"
                >
                  <OrbitControls makeDefault enableZoom={true} enablePan={true} />
                  <GraphSceneContent
                    activeNodeIds={activeNodeIds}
                    selectedNode={selectedNode}
                    setSelectedNode={setSelectedNode}
                  />
                </Canvas>

                {/* High-performance React 19 Screen-Space Overlay for Node Labels */}
                <div id="evidence-graph-labels" className="pointer-events-none absolute inset-0 overflow-hidden z-10">
                  {GRAPH_NODES.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const isHighlighted = activeNodeIds.has(node.id);

                    return (
                      <button
                        key={node.id}
                        data-node-id={node.id}
                        onClick={() => setSelectedNode(node)}
                        style={{ display: "none" }}
                        className={`pointer-events-auto absolute left-0 top-0 rounded-md px-2 py-0.5 text-[9px] font-mono font-medium backdrop-blur-md transition-colors whitespace-nowrap cursor-pointer select-none ${
                          isSelected
                            ? "bg-[var(--accent)] text-white shadow-lg border border-white/40 z-20 scale-105"
                            : isHighlighted
                            ? "bg-[var(--surface)] text-[var(--ink)] border border-[var(--accent)] z-10"
                            : "bg-[var(--surface)]/80 text-[var(--ink-2)] border border-[var(--line)] z-0"
                        }`}
                      >
                        {node.name}
                      </button>
                    );
                  })}
                </div>
              </Suspense>
            ) : (
              /* Accessible 2D Fallback Table */
              <div className="h-full overflow-y-auto p-6 bg-[var(--surface)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line)] font-mono text-[var(--ink-3)]">
                      <th className="py-2">Entity</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Source</th>
                      <th className="py-2">Provenance Hash</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {GRAPH_NODES.map((node) => (
                      <tr
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`hover:bg-[var(--surface-2)] cursor-pointer ${
                          selectedNode?.id === node.id ? "bg-[var(--surface-2)] font-semibold" : ""
                        }`}
                      >
                        <td className="py-2.5 font-medium text-[var(--ink)] flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: node.color }} />
                          {node.name}
                        </td>
                        <td className="py-2.5 text-[var(--ink-2)]">{node.entityType}</td>
                        <td className="py-2.5 uppercase font-mono text-[10px] text-[var(--ink-3)]">
                          {node.source}
                        </td>
                        <td className="py-2.5 font-mono text-[10px] text-[var(--ink-3)]">{node.hash}</td>
                        <td className="py-2.5">
                          <button className="text-[var(--accent)] hover:underline font-mono text-[10px]">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Viewport Control Instructions Pill */}
            <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[var(--line)] bg-[var(--surface)]/85 px-3 py-1.5 text-[11px] font-mono text-[var(--ink-2)] backdrop-blur-md shadow-xs pointer-events-none">
              Left Drag: Orbit · Right Drag: Pan · Scroll: Zoom · Click Node: Inspect
            </div>
          </div>

          {/* Right Column: Node Detail Inspector Drawer */}
          <div className="col-span-12 lg:col-span-4 flex flex-col justify-between rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-xl">
            {selectedNode ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Entity Type Badge & Status */}
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${selectedNode.color} 15%, transparent)`,
                        color: selectedNode.color,
                      }}
                    >
                      {selectedNode.entityType}
                    </span>

                    <span className="font-mono text-xs text-[var(--agreed)] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  </div>

                  {/* Title & Hash */}
                  <div className="mt-5">
                    <h3 className="font-heading text-xl font-semibold text-[var(--ink)]">
                      {selectedNode.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-[var(--ink-3)]">
                      {selectedNode.hash}
                    </p>
                  </div>

                  {/* Description Narrative */}
                  <p className="mt-4 text-xs leading-relaxed text-[var(--ink-2)]">
                    {selectedNode.description}
                  </p>

                  {/* Metadata Specs */}
                  <div className="mt-6 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--ink-3)]">Origin Source:</span>
                      <span className="font-mono font-semibold text-[var(--ink)] uppercase">
                        {selectedNode.source}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--ink-3)]">Timestamp:</span>
                      <span className="font-mono text-[var(--ink)]">
                        {selectedNode.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--ink-3)]">Confidence Score:</span>
                      <span className="font-mono font-semibold text-[var(--accent)]">
                        {(selectedNode.confidence * 100).toFixed(0)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[var(--line)] flex flex-col gap-2">
                  <a
                    href="/investigation"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110"
                  >
                    <span>Open node in full Investigation Canvas</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-[var(--ink-3)]">
                <Network className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-mono">Select any node in the graph to inspect evidence telemetry.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
