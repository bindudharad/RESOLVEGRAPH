"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Package,
  Network,
  Globe2,
  Scan,
  Layers,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Box,
  SlidersHorizontal,
} from "lucide-react";
import { DecryptedText } from "@/components/ui/decrypted-text";
import { SplineSceneView } from "./spline-scene-view";

// Dynamic import of 3D Canvas Scene with SSR disabled
const InspectionCanvasScene = dynamic(
  () => import("./inspection-canvas-scene").then((mod) => mod.InspectionCanvasScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[460px] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#090b10] text-center">
        <div className="space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <div className="font-mono text-xs uppercase tracking-widest text-cyan-400/80">
            Initializing Awwwards-Grade WebGL 3D Studio...
          </div>
        </div>
      </div>
    ),
  }
);

export type LabMode = "package" | "graph" | "settlement";
export type EngineMode = "r3f" | "spline";

export function Interactive3DInspectionLab() {
  const [engine, setEngine] = useState<EngineMode>("r3f");
  const [splineUrl, setSplineUrl] = useState("https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode");
  const [activeMode, setActiveMode] = useState<LabMode>("package");
  const [exploded, setExploded] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [inspectedNode, setInspectedNode] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#07080c] py-24 text-white">
      {/* Background Architectural Grid & Contours */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-40" />
      <div className="contours pointer-events-none absolute inset-0 opacity-25" />

      {/* Ambient Lighting Halos */}
      <div className="pointer-events-none absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-48 bottom-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 pb-10 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
              <Sparkles className="h-3 w-3" />
              Awwwards Studio 3D · GLTF & Spline Engine
            </div>
            <h2 className="text-3xl font-normal tracking-tight sm:text-5xl font-editorial">
              Inspect Physical Truth in <span className="italic text-cyan-300 font-serif">Three Dimensions</span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
              Production PBR GLTF models with studio city reflections, ContactShadows grounding, and bloom postprocessing. Toggle between R3F high-control studio mode and Spline interactive runtime.
            </p>
          </div>

          {/* Engine & Mode Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Engine Switcher */}
            <div className="flex rounded-xl border border-white/15 bg-white/5 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setEngine("r3f")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                  engine === "r3f"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-md shadow-cyan-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                <span>R3F + .GLB</span>
              </button>
              <button
                type="button"
                onClick={() => setEngine("spline")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                  engine === "spline"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold shadow-md shadow-violet-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Spline 3D</span>
              </button>
            </div>

            {/* Model Tabs (active in R3F mode) */}
            {engine === "r3f" && (
              <div className="flex rounded-xl border border-white/15 bg-white/5 p-1 backdrop-blur-md">
                <button
                  onClick={() => setActiveMode("package")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeMode === "package"
                      ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>3D Package .GLB</span>
                </button>
                <button
                  onClick={() => setActiveMode("graph")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeMode === "graph"
                      ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span>Security Core .GLB</span>
                </button>
                <button
                  onClick={() => setActiveMode("settlement")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeMode === "settlement"
                      ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>Settlement Rails</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Spline Custom URL Bar (if user switches to Spline mode) */}
        {engine === "spline" && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 font-mono text-xs">
            <span className="text-violet-300 font-semibold">Spline Scene URL:</span>
            <input
              type="text"
              value={splineUrl}
              onChange={(e) => setSplineUrl(e.target.value)}
              placeholder="Paste your Spline URL here (https://prod.spline.design/.../scene.splinecode)"
              className="flex-1 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">
              Compatible with export links from <span className="text-violet-300 font-semibold">spline.design</span>
            </span>
          </div>
        )}

        {/* Main 3D Studio Grid */}
        <div className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* 3D Canvas Viewport (8 cols) */}
          <div className="relative min-h-[540px] rounded-2xl border border-white/15 bg-[#0a0c13] shadow-2xl overflow-hidden lg:col-span-8 paper-dark">
            {/* Viewport Render: R3F Studio vs Spline */}
            <div className="absolute inset-0">
              {engine === "r3f" ? (
                <InspectionCanvasScene
                  mode={activeMode}
                  exploded={exploded}
                  scanning={scanning}
                  autoRotate={autoRotate}
                  onSelectNode={(name) => setInspectedNode(name)}
                />
              ) : (
                <SplineSceneView sceneUrl={splineUrl} />
              )}
            </div>

            {/* Viewport Overlay Controls (HUD) */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-1.5 backdrop-blur-md pointer-events-auto">
                {engine === "r3f" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-all ${
                        autoRotate ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                      }`}
                      title="Toggle Orbit Auto-Rotation"
                    >
                      <RotateCcw className={`h-3 w-3 ${autoRotate ? "animate-spin" : ""}`} />
                      <span>{autoRotate ? "Auto-Orbit ON" : "Auto-Orbit OFF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScanning(!scanning)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-all ${
                        scanning ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                      }`}
                      title="Toggle Laser Scan Effect"
                    >
                      <Scan className="h-3 w-3" />
                      <span>Laser Scan</span>
                    </button>

                    {activeMode === "package" && (
                      <button
                        type="button"
                        onClick={() => setExploded(!exploded)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-all ${
                          exploded ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                        }`}
                        title="Explode 3D Package Layers"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{exploded ? "Collapse Layers" : "Explode 3D Layers"}</span>
                      </button>
                    )}
                  </>
                )}

                {engine === "spline" && (
                  <div className="px-3 py-1 text-[11px] font-mono text-violet-300">
                    Spline Runtime Active · Canvas-Responsive
                  </div>
                )}
              </div>

              {/* Viewport Telemetry Badge */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur-md pointer-events-auto">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  {engine === "r3f" ? "City PBR · Bloom & Vignette · ContactShadows" : "Spline Interactive 3D"}
                </span>
              </div>
            </div>

            {/* Top Viewport Indicator */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase text-cyan-400/90 backdrop-blur-md">
              <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
            </div>
          </div>

          {/* Telemetry & Forensic Data Panel (4 cols) */}
          <div className="flex flex-col justify-between space-y-6 rounded-2xl border border-white/15 bg-[#0e1017]/95 p-6 shadow-xl lg:col-span-4 paper-dark">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                    Forensic Telemetry
                  </span>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  LIVE INSPECTION
                </span>
              </div>

              {activeMode === "package" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400">SPECIFICATION DISCREPANCY</div>
                    <div className="text-xl font-bold font-mono text-white">
                      <DecryptedText text="1,000 GB vs 512 GB" speed={30} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Outer retail box asserts 1,000 GB, but internal hardware NAND serial reflects 512 GB.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="text-[10px] text-slate-400">SEAL INTEGRITY</div>
                      <div className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>TAMPER-SECURE</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="text-[10px] text-slate-400">CARRIER WEIGHT</div>
                      <div className="mt-1 font-semibold text-amber-400">338g (vs 345g)</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase">SHA-256 PASSPORT HASH</div>
                    <div className="break-all text-[11px] text-cyan-300">
                      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </div>
                  </div>
                </div>
              )}

              {activeMode === "graph" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400">GRAPH TOPOLOGY</div>
                    <div className="text-lg font-bold font-mono text-white">
                      <DecryptedText text="Cryptographic Consensus Core" speed={25} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Faceted consensus gem and dual metallic gimbal rings reflecting bilateral agreement state.
                    </p>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {inspectedNode && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300">
                        <span className="text-[10px] text-amber-400/80 block uppercase">Selected 3D Node:</span>
                        <span className="font-bold whitespace-pre-line">{inspectedNode}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
                      <span>Buyer Purchase Memory</span>
                      <span className="font-bold">TXN-8921-PP</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-300">
                      <span>Contradiction Collision</span>
                      <span className="font-bold">D_exact = 1.00</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-300">
                      <span>BERR v2 Consensus</span>
                      <span className="font-bold">VERIFIED DELTA</span>
                    </div>
                  </div>
                </div>
              )}

              {activeMode === "settlement" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400">FINANCIAL SAFEGUARD STATUS</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      <DecryptedText text="10-Point Gate Approved" speed={30} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cryptographically locked proposal sign-off with multi-tenant isolation and zero floating-point math.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="text-[10px] text-slate-400">SETTLED AMOUNT</div>
                      <div className="mt-1 text-base font-bold text-white">₹1,800.00</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="text-[10px] text-slate-400">CLOSURE VELOCITY</div>
                      <div className="mt-1 text-base font-bold text-emerald-400">14 Minutes</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs flex items-center justify-between">
                    <span className="text-slate-400">PAYOUT CHANNEL</span>
                    <span className="text-sky-400 font-semibold">PayPal Sandbox Rail</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Invariant Banner */}
            <div className="border-t border-white/10 pt-4 font-mono text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Lock className="h-3 w-3" />
                Integer Paise Invariant
              </span>
              <span>TAT: &lt; 24h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
