"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const PARTICLE_COUNT = 800;
const CONNECTION_DISTANCE = 0.42;
const MAX_CONNECTIONS = 400;
const GLOBE_RADIUS = 2.2;
const ORBIT_RADIUS = 3.0;
const ORBIT_POINT_COUNT = 6;

const BRAND_PURPLE = new THREE.Color("#7c5cff");
const BRAND_CYAN = new THREE.Color("#38bdf8");

/* ---------------------------------------------------------------------------
   Geometry helpers
   --------------------------------------------------------------------------- */

/** Fibonacci sphere for even distribution of points on a sphere. */
function fibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1..1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;
  }
  return positions;
}

/* ---------------------------------------------------------------------------
   Particle sphere (instanced)
   --------------------------------------------------------------------------- */

function GlobeParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { positions, colors, pulsePhases } = useMemo(() => {
    const pos = fibonacciSphere(PARTICLE_COUNT, GLOBE_RADIUS);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Mix purple and cyan based on vertical position
      const t = (pos[i * 3 + 1] / GLOBE_RADIUS + 1) * 0.5; // 0..1
      const color = new THREE.Color().lerpColors(BRAND_CYAN, BRAND_PURPLE, t);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, colors: col, pulsePhases: phases };
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = clock.getElapsedTime();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      dummy.position.set(x, y, z);

      // Pulsing scale for ~30% of particles
      const shouldPulse = i % 3 === 0;
      const baseScale = 0.018;
      const scale = shouldPulse
        ? baseScale * (1 + 0.6 * Math.sin(time * 2.5 + pulsePhases[i]))
        : baseScale;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const colorAttr = useMemo(() => {
    return new THREE.InstancedBufferAttribute(colors, 3);
  }, [colors]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------------
   Connection lines between nearby particles
   --------------------------------------------------------------------------- */

function ConnectionLines() {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions: spherePositions, linePositions, lineColors } = useMemo(() => {
    const sPos = fibonacciSphere(PARTICLE_COUNT, GLOBE_RADIUS);
    const linePosArr: number[] = [];
    const lineColArr: number[] = [];

    let connectionCount = 0;

    for (let i = 0; i < PARTICLE_COUNT && connectionCount < MAX_CONNECTIONS; i++) {
      const ax = sPos[i * 3];
      const ay = sPos[i * 3 + 1];
      const az = sPos[i * 3 + 2];

      for (
        let j = i + 1;
        j < PARTICLE_COUNT && connectionCount < MAX_CONNECTIONS;
        j++
      ) {
        const bx = sPos[j * 3];
        const by = sPos[j * 3 + 1];
        const bz = sPos[j * 3 + 2];

        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DISTANCE) {
          linePosArr.push(ax, ay, az, bx, by, bz);

          // Gradient opacity based on distance
          const alpha = 1 - dist / CONNECTION_DISTANCE;
          const tA = (ay / GLOBE_RADIUS + 1) * 0.5;
          const tB = (by / GLOBE_RADIUS + 1) * 0.5;
          const cA = new THREE.Color().lerpColors(BRAND_CYAN, BRAND_PURPLE, tA);
          const cB = new THREE.Color().lerpColors(BRAND_CYAN, BRAND_PURPLE, tB);

          lineColArr.push(
            cA.r * alpha,
            cA.g * alpha,
            cA.b * alpha,
            cB.r * alpha,
            cB.g * alpha,
            cB.b * alpha,
          );
          connectionCount++;
        }
      }
    }

    return {
      positions: sPos,
      linePositions: new Float32Array(linePosArr),
      lineColors: new Float32Array(lineColArr),
    };
  }, []);

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[linePositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[lineColors, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.35}
        toneMapped={false}
      />
    </lineSegments>
  );
}

/* ---------------------------------------------------------------------------
   Orbiting data points
   --------------------------------------------------------------------------- */

function OrbitingPoints() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const orbitData = useMemo(() => {
    const data: Array<{
      inclination: number;
      phase: number;
      speed: number;
      radius: number;
      size: number;
      color: THREE.Color;
    }> = [];

    for (let i = 0; i < ORBIT_POINT_COUNT; i++) {
      data.push({
        inclination: (Math.random() - 0.5) * Math.PI * 0.7,
        phase: (Math.PI * 2 * i) / ORBIT_POINT_COUNT + Math.random() * 0.5,
        speed: 0.15 + Math.random() * 0.2,
        radius: ORBIT_RADIUS + Math.random() * 0.4,
        size: 0.035 + Math.random() * 0.025,
        color: new THREE.Color().lerpColors(
          BRAND_CYAN,
          BRAND_PURPLE,
          Math.random(),
        ),
      });
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = clock.getElapsedTime();

    for (let i = 0; i < ORBIT_POINT_COUNT; i++) {
      const d = orbitData[i];
      const angle = d.phase + time * d.speed;

      const x = Math.cos(angle) * d.radius;
      const z = Math.sin(angle) * d.radius;
      // Apply inclination
      const y = z * Math.sin(d.inclination);
      const zFinal = z * Math.cos(d.inclination);

      dummy.position.set(x, y, zFinal);
      // Pulse size
      const scale = d.size * (1 + 0.3 * Math.sin(time * 3 + i));
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const orbitColors = useMemo(() => {
    const arr = new Float32Array(ORBIT_POINT_COUNT * 3);
    for (let i = 0; i < ORBIT_POINT_COUNT; i++) {
      const c = orbitData[i].color;
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [orbitData]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, ORBIT_POINT_COUNT]}
    >
      <sphereGeometry args={[1, 12, 12]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[orbitColors, 3]}
        />
      </sphereGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------------
   Orbit rings (subtle visual guide)
   --------------------------------------------------------------------------- */

function OrbitRings() {
  const ringData = useMemo(
    () => [
      { radius: ORBIT_RADIUS - 0.1, rotation: [0.3, 0, 0] as const },
      { radius: ORBIT_RADIUS + 0.15, rotation: [-0.4, 0.3, 0.2] as const },
    ],
    [],
  );

  return (
    <>
      {ringData.map((ring, i) => (
        <mesh key={i} rotation={[...ring.rotation]}>
          <ringGeometry args={[ring.radius, ring.radius + 0.003, 128]} />
          <meshBasicMaterial
            color={i === 0 ? BRAND_PURPLE : BRAND_CYAN}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Atmospheric glow shell
   --------------------------------------------------------------------------- */

function AtmosphereGlow() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor1: { value: BRAND_PURPLE },
      uColor2: { value: BRAND_CYAN },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS + 0.15, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
            float t = (vPosition.y / ${GLOBE_RADIUS.toFixed(1)} + 1.0) * 0.5;
            t += sin(uTime * 0.3) * 0.1;
            vec3 color = mix(uColor2, uColor1, t);
            gl_FragColor = vec4(color, intensity * 0.25);
          }
        `}
      />
    </mesh>
  );
}

/* ---------------------------------------------------------------------------
   Globe group — handles auto-rotation + mouse tilt
   --------------------------------------------------------------------------- */

function GlobeScene() {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Track mouse position for tilt
  const mouse = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  const handlePointerMove = useCallback(
    (e: { clientX: number; clientY: number; target: EventTarget | null }) => {
      const target = e.target as HTMLElement | null;
      const rect = target?.getBoundingClientRect?.();
      if (!rect) return;
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 - 1;
    },
    [],
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const time = clock.getElapsedTime();

    // Auto-rotation
    const autoY = time * 0.08;

    // Smooth tilt toward mouse
    const tiltStrength = 0.15;
    targetRotation.current.x = mouse.current.y * tiltStrength;
    targetRotation.current.y = mouse.current.x * tiltStrength;

    group.rotation.y = autoY + targetRotation.current.y;
    group.rotation.x =
      group.rotation.x +
      (targetRotation.current.x - group.rotation.x) * 0.05;
  });

  return (
    <group ref={groupRef} onPointerMove={(e) => handlePointerMove(e)}>
      {/* Invisible sphere for pointer events */}
      <mesh>
        <sphereGeometry args={[ORBIT_RADIUS + 1, 16, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <GlobeParticles />
      <ConnectionLines />
      <OrbitingPoints />
      <OrbitRings />
      <AtmosphereGlow />
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Exported component — SSR-safe wrapper
   --------------------------------------------------------------------------- */

export default function HeroGlobe({ className }: { className?: string }) {
  return (
    <div className={className ?? "h-full w-full"}>
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
        // Disable raycaster when pointer leaves
        onPointerLeave={() => {}}
      >
        {/* Very faint ambient so particles pop */}
        <ambientLight intensity={0.1} />
        <GlobeScene />
      </Canvas>
    </div>
  );
}
