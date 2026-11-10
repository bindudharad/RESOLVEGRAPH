"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Deterministic pseudo-random generator for React 19 render purity */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Inner Three.js Scene Component */
function SceneContent() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const ringRef3 = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Mouse tracking state for subtle camera parallax
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotation.current.x = ny * 0.25;
      targetRotation.current.y = nx * 0.35;
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  // Bilateral Convergence Particles with deterministic placement
  const { particlePositions, particleColors } = useMemo(() => {
    const count = 480;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const buyerColor = new THREE.Color("#3D8CE6"); // Azure
    const merchantColor = new THREE.Color("#12B3A1"); // Teal
    const consensusColor = new THREE.Color("#7A5AE0"); // AI purple
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const isBuyer = i % 2 === 0;
      const rSeed1 = pseudoRandom(i * 3 + 1);
      const rSeed2 = pseudoRandom(i * 3 + 2);
      const rSeed3 = pseudoRandom(i * 3 + 3);

      const radius = 1.2 + rSeed1 * 3.2;
      const angle = rSeed2 * Math.PI * 2;
      const elevation = (rSeed3 - 0.5) * 1.8;

      const sideOffset = isBuyer ? -1.8 : 1.8;
      positions[i * 3] = Math.cos(angle) * radius * 0.7 + sideOffset * (radius / 4.4);
      positions[i * 3 + 1] = elevation;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7;

      // Color lerp based on distance to center
      const dist = Math.sqrt(positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2 + positions[i * 3 + 2] ** 2);
      const t = Math.max(0, Math.min(1, 1 - dist / 4.0));
      tempColor.lerpColors(isBuyer ? buyerColor : merchantColor, consensusColor, t);

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    return { particlePositions: positions, particleColors: colors };
  }, []);

  // Frame update
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (groupRef.current) {
      // Lerp group rotation towards cursor
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * 0.05;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y = elapsed * 0.35;
      coreRef.current.rotation.x = elapsed * 0.2;
      const s = 1 + Math.sin(elapsed * 2.0) * 0.04;
      coreRef.current.scale.set(s, s, s);
    }

    if (ringRef1.current) {
      ringRef1.current.rotation.z = elapsed * 0.25;
      ringRef1.current.rotation.x = Math.PI / 4 + Math.sin(elapsed * 0.5) * 0.1;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -elapsed * 0.18;
      ringRef2.current.rotation.y = Math.PI / 3 + Math.cos(elapsed * 0.4) * 0.1;
    }
    if (ringRef3.current) {
      ringRef3.current.rotation.x = elapsed * 0.15;
      ringRef3.current.rotation.y = elapsed * 0.22;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = elapsed * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient and Key Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} color="#FFFFFF" />
      <pointLight position={[-3, 0, 2]} intensity={2.2} color="#3D8CE6" distance={8} />
      <pointLight position={[3, 0, 2]} intensity={2.2} color="#12B3A1" distance={8} />
      <pointLight position={[0, 0, 0]} intensity={3.0} color="#7A5AE0" distance={5} />

      {/* Central Holographic Consensus Polyhedron */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color="#5C68FA"
          wireframe
          transparent
          opacity={0.65}
          emissive="#4350E5"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Inner Glowing Core */}
      <mesh>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial
          color="#7A5AE0"
          emissive="#7A5AE0"
          emissiveIntensity={1.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Orbital Ring 1: Buyer Vector */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[1.7, 0.018, 16, 80]} />
        <meshStandardMaterial
          color="#3D8CE6"
          emissive="#2B7BD6"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Orbital Ring 2: Merchant Vector */}
      <mesh ref={ringRef2}>
        <torusGeometry args={[2.1, 0.016, 16, 80]} />
        <meshStandardMaterial
          color="#12B3A1"
          emissive="#0C9A8A"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Orbital Ring 3: Arbitration Horizon */}
      <mesh ref={ringRef3}>
        <torusGeometry args={[2.5, 0.012, 16, 96]} />
        <meshStandardMaterial
          color="#D4871A"
          emissive="#D4871A"
          emissiveIntensity={0.4}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* 3D Bilateral Convergence Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particleColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/** Fallback for SSR or when WebGL is unavailable */
function WebGLFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(67,80,229,0.25)_0%,rgba(18,179,161,0.15)_45%,transparent_70%)] animate-pulse" />
      <div className="relative flex flex-col items-center gap-2 font-mono text-xs text-[var(--ink-3)]">
        <div className="h-24 w-24 rounded-full border border-dashed border-[var(--accent)] animate-spin [animation-duration:16s]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">
          Convergence Engine
        </span>
      </div>
    </div>
  );
}

const DynamicFiberCanvas = dynamic(
  () =>
    Promise.resolve(({ children }: { children: React.ReactNode }) => (
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        {children}
      </Canvas>
    )),
  { ssr: false, loading: () => <WebGLFallback /> }
);

export function Convergence3DScene({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={className || "relative h-full w-full min-h-[360px]"}>
        <WebGLFallback />
      </div>
    );
  }

  return (
    <div className={className || "relative h-full w-full min-h-[360px]"}>
      <DynamicFiberCanvas>
        <SceneContent />
      </DynamicFiberCanvas>
    </div>
  );
}
