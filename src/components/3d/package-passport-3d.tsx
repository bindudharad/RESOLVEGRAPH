"use client";

import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import {
  PackageCheck,
  Clock,
  ArrowRight,
  Eye,
} from "lucide-react";

interface DeliveryMilestone {
  step: string;
  location: string;
  timestamp: string;
  status: "verified" | "flagged" | "missing";
  weight: string;
  notes: string;
}

const MILESTONES: DeliveryMilestone[] = [
  {
    step: "01 · Origin Fulfillment",
    location: "Apex Tech Labs Warehouse, Austin TX",
    timestamp: "Jan 14, 2026 · 09:15 UTC",
    status: "verified",
    weight: "1,248g",
    notes: "Automated conveyor weigh-in matched SKU specs. Tamper seal #RG-SEAL-9981 applied.",
  },
  {
    step: "02 · Carrier Ingestion",
    location: "DHL Express Regional Sort Facility",
    timestamp: "Jan 14, 2026 · 17:40 UTC",
    status: "verified",
    weight: "1,248g",
    notes: "Intake optical barcode verification: Seal unbroken, manifest weight confirmed.",
  },
  {
    step: "03 · Intermediate Transit",
    location: "Air Freight Hub #3, Memphis TN",
    timestamp: "Jan 15, 2026 · 03:10 UTC",
    status: "missing",
    weight: "NO SCALE RECORD",
    notes: "Inflection Point: Intermediate conveyor weigh-in missing. Seal integrity unverified.",
  },
  {
    step: "04 · Destination Hub",
    location: "Metro Distribution Center, Seattle WA",
    timestamp: "Jan 16, 2026 · 08:22 UTC",
    status: "flagged",
    weight: "430g (Gross Mismatch)",
    notes: "Scale discrepancy logged by automated conveyor sorter: -818g under manifest weight.",
  },
  {
    step: "05 · Final Doorstep Delivery",
    location: "Buyer Residence, Seattle WA",
    timestamp: "Jan 16, 2026 · 14:22 UTC",
    status: "flagged",
    weight: "420g Net (Hollow Box)",
    notes: "Buyer unboxing video confirms package re-taped with clear tape. SSD hardware missing.",
  },
];

/** 3D Parcel Box Mesh */
function ParcelBox({
  tamperSealInspected,
  exploded,
}: {
  tamperSealInspected: boolean;
  exploded: boolean;
}) {
  const boxRef = useRef<THREE.Group>(null);
  const sealRef = useRef<THREE.Mesh>(null);
  const lidRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (lidRef.current) {
      const targetY = exploded ? 0.8 : 0.45;
      lidRef.current.position.y = THREE.MathUtils.damp(lidRef.current.position.y, targetY, 6, delta);
    }
    if (sealRef.current) {
      const targetEmissive = tamperSealInspected ? 0.9 : 0.3;
      (sealRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = targetEmissive;
    }
  });

  return (
    <group ref={boxRef}>
      {/* Box Carton Body */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[2.0, 1.0, 1.4]} />
        <meshStandardMaterial
          color="#BC7355"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Box Carton Lid */}
      <mesh ref={lidRef} castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2.05, 0.3, 1.45]} />
        <meshStandardMaterial
          color="#A86144"
          roughness={0.65}
          metalness={0.05}
        />
      </mesh>

      {/* Holographic Security Tamper Seal */}
      <mesh ref={sealRef} position={[0, 0.62, 0]}>
        <boxGeometry args={[0.5, 0.02, 1.48]} />
        <meshStandardMaterial
          color={tamperSealInspected ? "#E04539" : "#378D70"}
          emissive={tamperSealInspected ? "#E04539" : "#378D70"}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Shipping Label on Box Face */}
      <mesh position={[0, -0.15, 0.71]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#F4F1E8" roughness={0.9} />
      </mesh>

      {/* Internal Hardware Item visible when exploded */}
      {exploded && (
        <group position={[0, 0.1, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 0.08, 0.35]} />
            <meshStandardMaterial color="#12B3A1" metalness={0.8} roughness={0.2} emissive="#12B3A1" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function PackagePassport3D() {
  const [activeStep, setActiveStep] = useState(2); // Default to Hub #3 Inflection
  const [tamperSealInspected, setTamperSealInspected] = useState(false);
  const [exploded, setExploded] = useState(false);

  const milestone = MILESTONES[activeStep];

  return (
    <section className="relative border-b border-[var(--line)] bg-[var(--surface-2)]/40 py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <PackageCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>PACKAGE PASSPORT · 3D HARDWARE TELEMETRY</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Every millimeter of the box,
            <span className="block font-display italic text-[var(--accent)] font-medium">
              weighed and verified against tamper seals.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
            Drag to rotate the package in 3D space. Review chronological checkpoint weigh-ins to locate the exact transit facility where parcel weight dropped from 1,248g to 420g.
          </p>
        </div>

        {/* Interactive 3D Package View & Milestone Timeline */}
        <div className="mt-12 grid grid-cols-12 gap-8 items-stretch">
          {/* Left Column: 3D Draggable Package Canvas */}
          <div className="col-span-12 lg:col-span-7 relative h-[460px] sm:h-[520px] rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)]/80 p-2 shadow-2xl overflow-hidden">
            {/* Background grid */}
            <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Top Toolbar */}
            <div className="absolute top-4 inset-x-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]/85 px-3 py-1.5 text-xs font-mono text-[var(--ink-2)] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
                <span>DHL #TRK-9801</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTamperSealInspected((prev) => !prev)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
                    tamperSealInspected
                      ? "border-[var(--danger)] bg-[var(--danger)]/15 text-[var(--danger)] font-semibold"
                      : "border-[var(--line)] bg-[var(--surface)]/85 text-[var(--ink-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Eye className="inline h-3.5 w-3.5 mr-1" />
                  {tamperSealInspected ? "Seal Tamper Detected" : "Inspect Seal"}
                </button>

                <button
                  onClick={() => setExploded((prev) => !prev)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
                    exploded
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-semibold"
                      : "border-[var(--line)] bg-[var(--surface)]/85 text-[var(--ink-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  {exploded ? "Collapse Box" : "Explode Contents"}
                </button>
              </div>
            </div>

            {/* Exploded Component Indicator HUD */}
            {exploded && (
              <div className="absolute top-16 left-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--surface)]/90 px-3 py-1.5 text-[11px] font-mono text-[var(--ink)] shadow-md backdrop-blur-md animate-in fade-in duration-200">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="font-semibold text-[var(--accent)]">NVMe 2TB SSD</span>
                <span className="text-[var(--ink-3)]">· Internal Hardware Board</span>
              </div>
            )}

            {/* Canvas */}
            <Canvas
              camera={{ position: [2.5, 2.0, 3.5], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              className="h-full w-full"
            >
              <ambientLight intensity={0.9} />
              <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
              <OrbitControls makeDefault enableZoom={false} rotateSpeed={0.8} />
              <ParcelBox
                tamperSealInspected={tamperSealInspected}
                exploded={exploded}
              />
            </Canvas>

            {/* Bottom Orbit Instruction */}
            <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[var(--line)] bg-[var(--surface)]/85 px-3 py-1.5 text-[11px] font-mono text-[var(--ink-2)] backdrop-blur-md pointer-events-none">
              Drag to Orbit 360° · Click Buttons Above to Inspect
            </div>
          </div>

          {/* Right Column: Checkpoint Milestones Stepper */}
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-between rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                <span className="font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider">
                  Checkpoint Telemetry
                </span>
                <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                  Carrier Scale Ledger
                </span>
              </div>

              {/* Milestones Vertical List */}
              <div className="mt-6 space-y-3">
                {MILESTONES.map((m, index) => {
                  const isSelected = activeStep === index;
                  return (
                    <button
                      key={m.step}
                      onClick={() => setActiveStep(index)}
                      className={`w-full text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[var(--line-strong)] bg-[var(--surface-2)] shadow-sm"
                          : "border-transparent hover:bg-[var(--surface-2)]/60 text-[var(--ink-2)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[var(--ink)]">
                          {m.step}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase ${
                            m.status === "verified"
                              ? "bg-[var(--agreed)]/10 text-[var(--agreed)]"
                              : m.status === "missing"
                              ? "bg-[var(--missing)]/20 text-[var(--missing)]"
                              : "bg-[var(--danger)]/15 text-[var(--danger)]"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs text-[var(--ink-3)]">
                        <span>{m.location}</span>
                        <span className="font-mono font-semibold text-[var(--ink)]">
                          {m.weight}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Milestone Detail Box */}
              <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-3)]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{milestone.timestamp}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                  {milestone.notes}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--line)]">
              <a
                href="/packages"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110"
              >
                <span>Open Package Passport in workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
