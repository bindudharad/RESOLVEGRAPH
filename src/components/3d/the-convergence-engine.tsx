"use client";

import React, { useRef, useState, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Scale } from "lucide-react";

/** Interactive Pin Data Model */
interface EvidencePin {
  id: string;
  label: string;
  source: "buyer" | "merchant" | "payment" | "core";
  color: string;
  position: [number, number, number];
  details: string;
  hash: string;
}

const EVIDENCE_PINS: EvidencePin[] = [
  {
    id: "buyer-statement",
    label: "Buyer Statement & Unboxing",
    source: "buyer",
    color: "#4C91C8",
    position: [-2.4, 0.8, 0.4],
    details: "Unboxing session 4K video: Box arrived with re-taped seal, internal weight 420g (claimed 1,250g).",
    hash: "sha256:8f4b...3a1c",
  },
  {
    id: "merchant-manifest",
    label: "Merchant Dispatch Manifest",
    source: "merchant",
    color: "#388F7D",
    position: [2.4, -0.6, 0.4],
    details: "Automated warehouse scan: NVMe SSD 2TB serial verified, dispatch weigh-in: 1,248g at loading dock.",
    hash: "sha256:2d1e...99bb",
  },
  {
    id: "payment-rail",
    label: "Bank & Gateway Record",
    source: "payment",
    color: "#C18B45",
    position: [0, 2.2, -0.5],
    details: "Captured payment: $1,420.00 USD, 3D Secure v2 verified, settlement pending arbitration outcome.",
    hash: "sha256:bb70...41fa",
  },
  {
    id: "consensus-core",
    label: "Bilateral Consensus Core",
    source: "core",
    color: "#8875B5",
    position: [0, 0, 0],
    details: "Contradiction Engine: Discrepancy localized to carrier handoff hub #3. Escrow held safely.",
    hash: "sha256:77ae...010d",
  },
];

/** 3D Dynamic Connection Spline Line */
function ConnectionThread({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const lineGeometry = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.y += 0.4; // arch upwards slightly

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  return (
    <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65, linewidth: 2 }))} />
  );
}

/** Layered Document Mesh */
function DocumentMesh({
  position,
  rotation,
  color,
  onClick,
  isHovered,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  onClick: () => void;
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = isHovered ? 1.08 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* Slab base */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2.0, 0.06]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.15}
          emissive={color}
          emissiveIntensity={isHovered ? 0.35 : 0.08}
        />
      </mesh>

      {/* Subtle border highlight */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.51, 2.01, 0.07)]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

/** Central Consensus Core Gem & Gimbal Rings */
function ConsensusCore({
  isHovered,
  onClick,
}: {
  isHovered: boolean;
  onClick: () => void;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.4;
      coreRef.current.rotation.x = t * 0.25;
      const s = isHovered ? 1.25 : 1.0 + Math.sin(t * 2) * 0.04;
      coreRef.current.scale.set(s, s, s);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.2;
      ring1Ref.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.3) * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.18;
      ring2Ref.current.rotation.y = Math.PI / 3 + Math.cos(t * 0.3) * 0.15;
    }
  });

  return (
    <group onClick={onClick}>
      {/* Central Faceted Gem */}
      <mesh ref={coreRef} castShadow>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color="#8875B5"
          emissive="#8875B5"
          emissiveIntensity={isHovered ? 0.8 : 0.4}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Gimbal Ring 1 */}
      <group ref={ring1Ref}>
        <mesh>
          <torusGeometry args={[1.2, 0.02, 16, 64]} />
          <meshStandardMaterial color="#378D70" emissive="#378D70" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Gimbal Ring 2 */}
      <group ref={ring2Ref}>
        <mesh>
          <torusGeometry args={[1.5, 0.02, 16, 64]} />
          <meshStandardMaterial color="#4C91C8" emissive="#4C91C8" emissiveIntensity={0.25} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/** Interactive Scene Content */
function ConvergenceSceneContent({
  setActivePin,
  hoveredSource,
  setHoveredSource,
}: {
  setActivePin: (pin: EvidencePin | null) => void;
  hoveredSource: string | null;
  setHoveredSource: (src: string | null) => void;
}) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  // Pointer tracking for organic parallax
  useEffect(() => {
    const onPointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotation.current.y = nx * 0.35;
      targetRotation.current.x = -ny * 0.25;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useFrame((_, delta) => {
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.y,
        targetRotation.current.y,
        3,
        delta
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.x,
        targetRotation.current.x,
        3,
        delta
      );
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <pointLight position={[-4, 2, 2]} color="#4C91C8" intensity={2} distance={8} />
      <pointLight position={[4, -2, 2]} color="#388F7D" intensity={2} distance={8} />
      <pointLight position={[0, 0, 3]} color="#8875B5" intensity={1.5} distance={6} />

      {/* Central Consensus Core */}
      <ConsensusCore
        isHovered={hoveredSource === "core"}
        onClick={() => setActivePin(EVIDENCE_PINS[3])}
      />

      {/* Layer 1: Buyer Document Slab */}
      <DocumentMesh
        position={[-2.2, 0.4, 0.2]}
        rotation={[0.1, 0.35, -0.05]}
        color="#4C91C8"
        isHovered={hoveredSource === "buyer"}
        onClick={() => setActivePin(EVIDENCE_PINS[0])}
      />

      {/* Layer 2: Merchant Dispatch Slab */}
      <DocumentMesh
        position={[2.2, -0.4, 0.2]}
        rotation={[-0.1, -0.35, 0.05]}
        color="#388F7D"
        isHovered={hoveredSource === "merchant"}
        onClick={() => setActivePin(EVIDENCE_PINS[1])}
      />

      {/* Layer 3: Payment Record Slab */}
      <DocumentMesh
        position={[0, 1.9, -0.4]}
        rotation={[0.3, 0, 0]}
        color="#C18B45"
        isHovered={hoveredSource === "payment"}
        onClick={() => setActivePin(EVIDENCE_PINS[2])}
      />

      {/* Dynamic Connecting Evidence Threads */}
      <ConnectionThread start={[-2.2, 0.4, 0.2]} end={[0, 0, 0]} color="#4C91C8" />
      <ConnectionThread start={[2.2, -0.4, 0.2]} end={[0, 0, 0]} color="#388F7D" />
      <ConnectionThread start={[0, 1.9, -0.4]} end={[0, 0, 0]} color="#C18B45" />

      {/* Interactive 3D Nodes */}
      {EVIDENCE_PINS.map((pin) => (
        <group key={pin.id} position={pin.position}>
          <mesh
            onClick={() => setActivePin(pin)}
            onPointerOver={() => setHoveredSource(pin.source)}
            onPointerOut={() => setHoveredSource(null)}
          >
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial
              color={pin.color}
              emissive={pin.color}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}

      {/* Screen-Space Projector for Pin Labels */}
      <ConvergencePinProjector />
    </group>
  );
}

/** Projector synchronizing 3D pin locations with DOM label buttons */
function ConvergencePinProjector() {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const container = document.getElementById("convergence-pins-overlay");
    if (!container) return;

    for (const pin of EVIDENCE_PINS) {
      const el = document.getElementById(`convergence-pin-${pin.id}`);
      if (!el) continue;

      v.set(pin.position[0], pin.position[1] + 0.35, pin.position[2]);
      v.project(camera);

      // Check if behind camera
      if (v.z > 1) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        continue;
      }

      const x = ((v.x + 1) / 2) * size.width;
      const y = ((-v.y + 1) / 2) * size.height;

      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
    }
  });

  return null;
}

/** Fallback Static Rendering for Mobile / Non-WebGL Environments */
function ConvergenceFallback({
  onSelectPin,
}: {
  onSelectPin: (pin: EvidencePin) => void;
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[var(--surface-2)]/40 to-transparent rounded-3xl border border-[var(--line)]">
      <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] shadow-xl">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--accent)]/30 animate-spin" style={{ animationDuration: "20s" }} />
        <Scale className="h-12 w-12 text-[var(--accent)]" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-[var(--ink)]">
        The Convergence Engine
      </h3>
      <p className="mt-2 text-xs text-[var(--ink-2)] max-w-sm">
        Bilateral reconciliation nodes connecting independent buyer unboxing telemetry with merchant warehouse dispatch manifests.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-xs">
        {EVIDENCE_PINS.slice(0, 2).map((pin) => (
          <button
            key={pin.id}
            onClick={() => onSelectPin(pin)}
            className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 text-left text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pin.color }} />
            <span className="truncate">{pin.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Exported Main 3D Component */
export function TheConvergenceEngine() {
  const [activePin, setActivePin] = useState<EvidencePin | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }
  }, []);

  return (
    <div className="relative h-[480px] sm:h-[540px] lg:h-[620px] w-full select-none rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)]/30 p-2 shadow-2xl backdrop-blur-sm overflow-hidden">
      {/* Subtle background coordinate grid */}
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top HUD Telemetry Banner */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]/80 px-3 py-1.5 text-[11px] font-mono text-[var(--ink-2)] backdrop-blur-md shadow-xs pointer-events-none">
        <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
        <span>CONVERGENCE ENGINE ACTIVE</span>
        <span className="text-[var(--ink-3)]">· Orbit & Click Pins</span>
      </div>

      {/* Interactive HTML Pins Screen-Space Overlay */}
      <div
        id="convergence-pins-overlay"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        aria-hidden="true"
      >
        {EVIDENCE_PINS.map((pin) => (
          <button
            key={pin.id}
            id={`convergence-pin-${pin.id}`}
            onClick={() => setActivePin(pin)}
            onMouseEnter={() => setHoveredSource(pin.source)}
            onMouseLeave={() => setHoveredSource(null)}
            style={{ opacity: 0 }}
            className="pointer-events-auto absolute left-0 top-0 group flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-mono font-medium text-[var(--ink)] shadow-md backdrop-blur-md transition-all hover:scale-105 hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-ping"
              style={{ backgroundColor: pin.color }}
            />
            <span>{pin.label}</span>
          </button>
        ))}
      </div>

      {/* 3D WebGL Canvas */}
      {hasWebGL ? (
        <Suspense fallback={<ConvergenceFallback onSelectPin={setActivePin} />}>
          <Canvas
            camera={{ position: [0, 0, 6.2], fov: 44 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
            className="h-full w-full"
          >
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.7}
              rotateSpeed={0.5}
            />
            <ConvergenceSceneContent
              setActivePin={setActivePin}
              hoveredSource={hoveredSource}
              setHoveredSource={setHoveredSource}
            />
          </Canvas>
        </Suspense>
      ) : (
        <ConvergenceFallback onSelectPin={setActivePin} />
      )}

      {/* Bottom Detail Inspection Overlay Drawer */}
      {activePin && (
        <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)]/95 p-4 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: activePin.color }}
              />
              <div>
                <h4 className="text-xs font-semibold text-[var(--ink)]">
                  {activePin.label}
                </h4>
                <p className="font-mono text-[10px] text-[var(--ink-3)]">
                  {activePin.hash}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActivePin(null)}
              className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)] p-1 rounded-md hover:bg-[var(--surface-2)]"
            >
              Close ✕
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
            {activePin.details}
          </p>
        </div>
      )}
    </div>
  );
}
