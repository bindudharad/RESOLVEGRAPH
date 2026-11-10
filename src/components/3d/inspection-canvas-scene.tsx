"use client";

import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useGLTF,
  Center,
  Bounds,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { LabMode } from "./interactive-3d-inspection-lab";

// Preload production .glb models
if (typeof window !== "undefined") {
  useGLTF.preload("/models/forensic-package.glb");
  useGLTF.preload("/models/security-core.glb");
}

interface InspectionCanvasSceneProps {
  mode: LabMode;
  exploded: boolean;
  scanning: boolean;
  autoRotate: boolean;
  onSelectNode: (name: string) => void;
}

function ModelLoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#06b6d4" wireframe />
    </mesh>
  );
}

// ---------------------------------------------------------------------
// 1. Production .glb Forensic Package Model with Exploded Layers
// ---------------------------------------------------------------------
function GlbPackageModel({ exploded, scanning }: { exploded: boolean; scanning: boolean }) {
  const { scene } = useGLTF("/models/forensic-package.glb");
  const modelRef = useRef<THREE.Group>(null);
  const laserRef = useRef<THREE.Mesh>(null);
  const laserDirection = useRef<number>(1);

  // Targets for exploded layers
  const targetLidY = exploded ? 1.4 : 0.2;
  const targetBottomY = exploded ? -1.3 : -0.35;
  const targetChipY = exploded ? 0.0 : 0.0;
  const targetChipScale = exploded ? 1.25 : 1.0;

  useFrame((_, delta) => {
    // 1. Laser scanning beam animation
    if (scanning && laserRef.current) {
      laserRef.current.position.y += delta * laserDirection.current * 1.8;
      if (laserRef.current.position.y > 1.6) {
        laserDirection.current = -1;
      } else if (laserRef.current.position.y < -1.6) {
        laserDirection.current = 1;
      }
    }

    // 2. Smooth layer explosion lerp on loaded GLTF children
    if (modelRef.current) {
      const lid = modelRef.current.getObjectByName("CartonLid");
      const label = modelRef.current.getObjectByName("LabelBarcode");
      const seal = modelRef.current.getObjectByName("SecuritySeal");
      const bottom = modelRef.current.getObjectByName("CartonBottom");
      const pcb = modelRef.current.getObjectByName("InternalHardwareSSD");

      if (lid) {
        lid.position.y = THREE.MathUtils.lerp(lid.position.y, targetLidY, delta * 6);
      }
      if (label) {
        label.position.y = THREE.MathUtils.lerp(label.position.y, targetLidY + 0.18, delta * 6);
      }
      if (seal) {
        seal.position.y = THREE.MathUtils.lerp(seal.position.y, targetLidY + 0.182, delta * 6);
      }
      if (bottom) {
        bottom.position.y = THREE.MathUtils.lerp(bottom.position.y, targetBottomY, delta * 6);
      }
      if (pcb) {
        pcb.position.y = THREE.MathUtils.lerp(pcb.position.y, targetChipY, delta * 6);
        const curScale = pcb.scale.x;
        const newScale = THREE.MathUtils.lerp(curScale, targetChipScale, delta * 6);
        pcb.scale.set(newScale, newScale, newScale);
      }
    }
  });

  return (
    <group dispose={null}>
      {/* Real-time Laser Scanner Sweep Plane */}
      {scanning && (
        <mesh ref={laserRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 3.8]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Production GLTF Model Cloned Scene */}
      <group ref={modelRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------
// 2. Production .glb Cryptographic Security Core Model
// ---------------------------------------------------------------------
function GlbSecurityCoreModel({ onSelectNode }: { onSelectNode: (name: string) => void }) {
  const { scene } = useGLTF("/models/security-core.glb");
  const coreRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (coreRef.current) {
      const ring1 = coreRef.current.getObjectByName("GimbalRing1");
      const ring2 = coreRef.current.getObjectByName("GimbalRing2");
      const gem = coreRef.current.getObjectByName("CentralGem");

      if (ring1) ring1.rotation.z += delta * 0.4;
      if (ring2) ring2.rotation.y += delta * 0.35;
      if (gem) gem.rotation.y += delta * 0.25;
    }
  });

  return (
    <group
      ref={coreRef}
      dispose={null}
      onClick={() => onSelectNode("Consensus Invariant Core")}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

// ---------------------------------------------------------------------
// 3. Multi-Currency Global Settlement Rails Model
// ---------------------------------------------------------------------
function SettlementRails3DModel() {
  const globeRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Group>(null);
  const ringRef2 = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.15;
    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * 0.25;
      ringRef1.current.rotation.x += delta * 0.12;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * 0.2;
      ringRef2.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <group dispose={null}>
      {/* Central Holographic Globe */}
      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[1.5, 24, 24]} />
          <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.35} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.45, 32, 32]} />
          <meshStandardMaterial
            color="#082f49"
            roughness={0.7}
            metalness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Orbit Ring 1 (PayPal & SEPA) */}
      <group ref={ringRef1}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.2, 0.02, 16, 100]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
        </mesh>
        <mesh position={[2.2, 0, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Orbit Ring 2 (India UPI ₹ Rail) */}
      <group ref={ringRef2}>
        <mesh rotation={[-Math.PI / 4, 0, 0]}>
          <torusGeometry args={[2.6, 0.025, 16, 100]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
        </mesh>
        <mesh position={[-2.6, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------
// Master Canvas Scene with Studio Environment & Post-Processing
// ---------------------------------------------------------------------
export function InspectionCanvasScene({
  mode,
  exploded,
  scanning,
  autoRotate,
  onSelectNode,
}: InspectionCanvasSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.8, 5.0], fov: 46 }}
      className="h-full w-full"
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        antialias: true,
        alpha: true,
      }}
    >
      {/* Studio Lighting & PBR Environment Reflections */}
      <Environment preset="city" />

      {/* Ground Contact Shadows */}
      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.65}
        scale={10}
        blur={2}
        far={4}
        color="#00ffff"
      />

      <Float speed={autoRotate ? 1.5 : 0} rotationIntensity={0.2} floatIntensity={0.3}>
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <Suspense fallback={<ModelLoadingFallback />}>
              {mode === "package" && (
                <GlbPackageModel exploded={exploded} scanning={scanning} />
              )}
              {mode === "graph" && (
                <GlbSecurityCoreModel onSelectNode={onSelectNode} />
              )}
              {mode === "settlement" && <SettlementRails3DModel />}
            </Suspense>
          </Center>
        </Bounds>
      </Float>

      {/* Controls & Camera */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={true}
        autoRotate={autoRotate}
        autoRotateSpeed={1.0}
        minDistance={2.5}
        maxDistance={8.0}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
      />

      {/* Post-Processing Effects Composer: Bloom & Vignette */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.3}
          intensity={1.2}
          mipmapBlur
        />
        <Vignette darkness={0.9} offset={0.1} />
      </EffectComposer>
    </Canvas>
  );
}
