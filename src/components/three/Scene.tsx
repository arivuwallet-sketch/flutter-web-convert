import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Design tokens are oklch, which three.js cannot parse.
 * Resolve them to rgb through a 2D canvas before handing them to materials.
 */
function readToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fallback;
  }
}

/** Slow-drifting device slabs — the visual signature of the console. */
function DeviceSlab({
  position,
  rotation,
  accent,
  scale = 1,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  accent: string;
  scale?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.12;
    ref.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.4 + position[0]) * 0.25;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[1.15, 2.3, 0.1]} />
        <meshStandardMaterial color="#101314" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[1.0, 2.14]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.3} />
      </mesh>
      <lineSegments position={[0, 0, 0.058]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.0, 2.14)]} />
        <lineBasicMaterial color={accent} transparent opacity={0.65} />
      </lineSegments>
    </group>
  );
}

/** Wireframe terrain grid that breathes. */
function Grid({ accent }: { accent: string }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(70, 70, 42, 42);
    return new THREE.WireframeGeometry(plane);
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.z = ((state.clock.elapsedTime * 0.6) % 1.66) - 1.66;
    }
  });

  return (
    <lineSegments
      ref={ref}
      geometry={geometry}
      rotation-x={-Math.PI / 2}
      position={[0, -4.2, 0]}
    >
      <lineBasicMaterial color={accent} transparent opacity={0.22} />
    </lineSegments>
  );
}

/** Depth field of drifting points. */
function Dust({ accent }: { accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={accent} size={0.055} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

/** Camera parallax driven by pointer position. */
function Parallax() {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-2.5 * dt);
    state.camera.position.x += (state.pointer.x * 1.6 - state.camera.position.x) * k;
    state.camera.position.y += (1 + state.pointer.y * 1.0 - state.camera.position.y) * k;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function Scene({ dense }: { dense: boolean }) {
  const accent = readToken("--primary", "#4ade9f");
  const bg = readToken("--background", "#080a0a");

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 1, 11], fov: 52 }}
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 18, 46]} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 8]} intensity={1.1} />
      <pointLight position={[-8, -2, 4]} intensity={22} color={accent} distance={26} />

      <Environment>
        <Lightformer intensity={1.6} position={[0, 6, 2]} scale={[12, 12, 1]} />
        <Lightformer
          intensity={1.1}
          color={accent}
          position={[-6, 1, -2]}
          rotation-y={Math.PI / 2}
          scale={[18, 2, 1]}
        />
      </Environment>

      <Parallax />
      <Grid accent={accent} />
      <Dust accent={accent} />

      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.6}>
        <DeviceSlab position={[-5.4, 0.4, -2]} rotation={[0.15, 0.5, 0.08]} accent={accent} scale={1.25} />
      </Float>
      <Float speed={0.9} rotationIntensity={0.2} floatIntensity={0.5}>
        <DeviceSlab position={[5.6, -0.6, -3]} rotation={[-0.1, -0.6, -0.12]} accent={accent} scale={1.4} />
      </Float>
      {dense ? (
        <>
          <Float speed={1.3} rotationIntensity={0.3} floatIntensity={0.7}>
            <DeviceSlab position={[0.2, 2.4, -7]} rotation={[0.2, 0.2, 0.3]} accent={accent} scale={0.9} />
          </Float>
          <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.4}>
            <DeviceSlab position={[-2.6, -2.8, -6]} rotation={[-0.2, 0.9, -0.25]} accent={accent} scale={0.8} />
          </Float>
        </>
      ) : null}
    </Canvas>
  );
}
