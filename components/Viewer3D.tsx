
import React, { Suspense, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Line, Sphere, ContactShadows } from '@react-three/drei';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Path3D, ToolMode } from '../types';
import { MainModel } from './models';


interface Viewer3DProps {
  isDrawingMode: boolean;
  activeTool: ToolMode;
  paths3D: Path3D[];
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
}

const Loader = () => (
  <Html center>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white text-sm font-bold tracking-widest uppercase bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
        Initializing 3D Space
      </p>
    </div>
  </Html>
);

// Memoized Line renderer for optimized 3D path rendering
const LineGroup = memo(({ paths3D }: { paths3D: Path3D[] }) => {
  // Memoize Vector3 arrays to avoid recreating them
  const vectorArrays = useMemo(() => {
    return paths3D.map(path => ({
      id: path.id,
      points: path.points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
      color: path.color,
      width: path.width
    }));
  }, [paths3D]);

  return (
    <>
      {vectorArrays.map((pathData) => (
        <Line
          key={pathData.id}
          points={pathData.points}
          color={pathData.color}
          lineWidth={pathData.width}
          polygonOffset
          polygonOffsetFactor={-15}
        />
      ))}
    </>
  );
});

LineGroup.displayName = 'LineGroup';

// Custom gradient sky with deep blue to light blue
const GradientSky = () => {
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (mesh.current) {
      const geometry = mesh.current.geometry as THREE.SphereGeometry;
      const count = geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const y = geometry.attributes.position.getY(i);
        // Normalize y to 0-1 range (top to bottom of sphere)
        const t = (y + 1) * 0.5;
        
        // Deep blue at top: #1e3a8a
        // Light blue at horizon: #7dd3fc
        const deepBlue = new THREE.Color(0x1e3a8a);
        const lightBlue = new THREE.Color(0x7dd3fc);
        
        const color = deepBlue.clone().lerp(lightBlue, 1 - t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
  }, []);

  return (
    // eslint-disable-next-line react/no-unknown-property
    <mesh ref={mesh} scale={[1000, 1000, 1000]}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <sphereGeometry args={[1, 32, 32]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <meshBasicMaterial vertexColors side={THREE.BackSide} />
    </mesh>
  );
};


// Precomputed bounding sphere for fast collision rejection
interface PathBounds {
  cx: number;
  cy: number;
  cz: number;
  radius: number;
}

function computePathBounds(path: Path3D): PathBounds {
  const pts = path.points;
  if (pts.length === 0) return { cx: 0, cy: 0, cz: 0, radius: 0 };
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < pts.length; i++) {
    cx += pts[i].x; cy += pts[i].y; cz += pts[i].z;
  }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let maxRSq = 0;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - cx, dy = pts[i].y - cy, dz = pts[i].z - cz;
    const dSq = dx * dx + dy * dy + dz * dz;
    if (dSq > maxRSq) maxRSq = dSq;
  }
  return { cx, cy, cz, radius: Math.sqrt(maxRSq) };
}

const ModelWithAnnotations = ({
  activeTool,
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth,
  paths3D
}: {
  activeTool: ToolMode;
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  paths3D: Path3D[];
}) => {
  const modelGroupRef = useRef<THREE.Group>(null);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{point: THREE.Vector3, normal: THREE.Vector3} | null>(null);
  const isDrawing3D = useRef(false);
  const lastHoverTimeRef = useRef(0);
  const OFFSET_DISTANCE = 0.015;
  const HOVER_THROTTLE_MS = 16; // ~60fps

  // Precompute bounding spheres for all paths — only recalculated when paths change
  const boundsMap = useMemo(() => {
    const map = new Map<string, PathBounds>();
    for (const path of paths3D) {
      map.set(path.id, computePathBounds(path));
    }
    return map;
  }, [paths3D]);

  const createToonMaterial = useCallback((material: THREE.Material) => {
    const source = material as any;
    if (source.userData?.__isToon) return material as THREE.MeshToonMaterial;

    const toon = new THREE.MeshToonMaterial({
      color: source.color?.clone?.() ?? new THREE.Color('#ffffff'),
      map: source.map ?? null,
      emissive: source.emissive?.clone?.() ?? new THREE.Color('#000000'),
      emissiveMap: source.emissiveMap ?? null,
      normalMap: source.normalMap ?? null,
      normalScale: source.normalScale?.clone?.(),
      alphaMap: source.alphaMap ?? null,
      transparent: source.transparent ?? false,
      opacity: source.opacity ?? 1,
      side: source.side ?? THREE.FrontSide,
      vertexColors: source.vertexColors ?? false,
      depthWrite: source.depthWrite ?? true,
      depthTest: source.depthTest ?? true,
    });

    if (source.skinning !== undefined) (toon as any).skinning = source.skinning;
    if (source.morphTargets !== undefined) (toon as any).morphTargets = source.morphTargets;
    if (source.morphNormals !== undefined) (toon as any).morphNormals = source.morphNormals;

    (toon as any).userData = source.userData
      ? { ...source.userData, __isToon: true }
      : { __isToon: true };
    toon.needsUpdate = true;
    return toon;
  }, []);

  const applyToonMaterial = useCallback((root: THREE.Object3D) => {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if ((object as any).userData?.skipToon) return;

      object.castShadow = false;
      object.receiveShadow = false;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((mat) => createToonMaterial(mat));
      } else if (object.material) {
        object.material = createToonMaterial(object.material);
      }
    });
  }, [createToonMaterial]);

  const getSurfacePoint = useCallback((e: any) => {
    if (!e.point || !e.face) return null;
    const point = e.point.clone();
    const normal = e.face.normal.clone();
    normal.applyQuaternion(e.object.quaternion);
    point.add(normal.multiplyScalar(OFFSET_DISTANCE));
    return { point, normal };
  }, []);

  // Bounding-sphere first, then point-level check
  const checkPathIntersection = useCallback((path: Path3D, px: number, py: number, pz: number, radius: number): boolean => {
    const bounds = boundsMap.get(path.id);
    if (!bounds) return false;

    // Fast rejection: bounding sphere vs eraser sphere
    const dx0 = bounds.cx - px;
    const dy0 = bounds.cy - py;
    const dz0 = bounds.cz - pz;
    const combinedR = bounds.radius + radius;
    if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > combinedR * combinedR) return false;

    // Detailed check — iterate with early exit
    const radiusSq = radius * radius;
    const pts = path.points;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - px;
      const dy = pts[i].y - py;
      const dz = pts[i].z - pz;
      if (dx * dx + dy * dy + dz * dz < radiusSq) return true;
    }
    return false;
  }, [boundsMap]);

  const eraseAt = useCallback((point: THREE.Vector3) => {
    const eraserRadius = eraserWidth / 40;
    const px = point.x, py = point.y, pz = point.z;
    for (let i = 0; i < paths3D.length; i++) {
      if (checkPathIntersection(paths3D[i], px, py, pz, eraserRadius)) {
        onRemovePath3D(paths3D[i].id);
      }
    }
  }, [paths3D, eraserWidth, checkPathIntersection, onRemovePath3D]);

  const handlePointerDown = useCallback((e: any) => {
    if (activeTool === 'pencil3d') {
      e.stopPropagation();
      const surface = getSurfacePoint(e);
      if (surface) {
        isDrawing3D.current = true;
        setCurrentPoints([surface.point]);
      }
    } else if (activeTool === 'eraser3d') {
      e.stopPropagation();
      isDrawing3D.current = true;
      eraseAt(e.point);
    }
  }, [activeTool, getSurfacePoint, eraseAt]);

  const handlePointerMove = useCallback((e: any) => {
    const now = performance.now();

    if (now - lastHoverTimeRef.current > HOVER_THROTTLE_MS) {
      const surface = getSurfacePoint(e);
      if (surface) {
        setHoverInfo(surface);
      }
      lastHoverTimeRef.current = now;
    }

    if (isDrawing3D.current) {
      e.stopPropagation();

      if (activeTool === 'pencil3d') {
        const surface = getSurfacePoint(e);
        if (surface) {
          const lastPoint = currentPoints.at(-1);
          if (!lastPoint || surface.point.distanceTo(lastPoint) > 0.02) {
            setCurrentPoints(prev => [...prev, surface.point]);
          }
        }
      } else if (activeTool === 'eraser3d') {
        eraseAt(e.point);
      }
    }
  }, [activeTool, currentPoints, getSurfacePoint, eraseAt]);

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDrawing3D.current) {
        if (currentPoints.length > 1 && activeTool === 'pencil3d') {
          onAddPath3D({
            id: Math.random().toString(36).substring(2, 11),
            points: currentPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
            color: currentColor,
            width: pencilWidth
          });
        }
        isDrawing3D.current = false;
        setCurrentPoints([]);
      }
    };
    globalThis.addEventListener('pointerup', handleGlobalUp);
    return () => globalThis.removeEventListener('pointerup', handleGlobalUp);
  }, [currentPoints, activeTool, currentColor, pencilWidth, onAddPath3D]);

  useEffect(() => {
    if (modelGroupRef.current) {
      applyToonMaterial(modelGroupRef.current);
    }
  }, [applyToonMaterial]);

  return (
    <group ref={modelGroupRef} onPointerLeave={() => setHoverInfo(null)}>
      <MainModel
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />

      {/* Ground plane - also drawable with 3D pencil */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <mesh 
        position={[0, -0.65, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* eslint-disable-next-line react/no-unknown-property */}
        <planeGeometry args={[200, 200]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meshStandardMaterial color="#18941e" />
      </mesh>
      
      {hoverInfo && (activeTool === 'pencil3d' || activeTool === 'eraser3d') && (
        // eslint-disable-next-line react/no-unknown-property
        <Sphere
          args={[activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200, 8, 8]}
          position={hoverInfo.point}
          userData={{ skipToon: true }}
        >
          {/* eslint-disable react/no-unknown-property */}
          <meshBasicMaterial 
            color={activeTool === 'eraser3d' ? '#ff4444' : currentColor}
            transparent
            opacity={0.7}
          />
          {/* eslint-enable react/no-unknown-property */}
        </Sphere>
      )}

      {currentPoints.length > 1 && (
        <Line
          points={currentPoints}
          color={currentColor}
          lineWidth={pencilWidth}
          polygonOffset
          polygonOffsetFactor={-15}
        />
      )}
    </group>
  );
};

const Viewer3D: React.FC<Viewer3DProps> = ({ 
  isDrawingMode, 
  activeTool, 
  paths3D, 
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [directionalIntensity, setDirectionalIntensity] = useState(1);
  const [ambientIntensity, setAmbientIntensity] = useState(0.35);

  const { sunPosition, sunColor, sunIntensity } = useMemo(() => {
    // Fixed sun position (14:00 / 2pm)
    const sunPos = new THREE.Vector3(130, 150, 130);
    const color = new THREE.Color('#ffffff');
    const intensity = 1.2;

    return { sunPosition: [sunPos.x, sunPos.y, sunPos.z] as [number, number, number], sunColor: color, sunIntensity: intensity };
  }, []);




  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900">
      <div className="absolute top-6 left-6 z-30 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-4 text-white shadow-2xl space-y-4">
        <div className="border-t border-white/10 pt-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300 font-black">Directional</div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="3"
              step="0.05"
              value={directionalIntensity}
              onChange={(e) => setDirectionalIntensity(Number.parseFloat(e.target.value))}
              className="w-40 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400"
            />
            <span className="text-xs font-mono w-12 text-right">{directionalIntensity.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-black">Ambient</div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={ambientIntensity}
              onChange={(e) => setAmbientIntensity(Number.parseFloat(e.target.value))}
              className="w-40 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-xs font-mono w-12 text-right">{ambientIntensity.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <Canvas 
        camera={{ position: [50, 50, 50], fov: 60, near: 0.1, far: 10000 }} 
        dpr={[1, 1.5]}
        style={{ touchAction: 'none' }}
      >
        <GradientSky />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <ambientLight intensity={ambientIntensity} />
        {/* eslint-disable react/no-unknown-property */}
        <directionalLight 
          ref={lightRef}
          position={sunPosition}
          color={sunColor}
          intensity={sunIntensity * directionalIntensity}
        />
        {/* eslint-enable react/no-unknown-property */}

        
        <Suspense fallback={<Loader />}>
          <ContactShadows
            position={[0, -0.19, 0]}
            opacity={0.35}
            scale={200}
            blur={1}
            far={25}
            resolution={256}
            color="#000000"
          />
          <ModelWithAnnotations 

              activeTool={activeTool} 
              onAddPath3D={onAddPath3D}
              onRemovePath3D={onRemovePath3D}
              currentColor={currentColor}
              pencilWidth={pencilWidth}
              eraserWidth={eraserWidth}
              paths3D={paths3D}
            />
            <LineGroup paths3D={paths3D} />
          <Environment preset="sunset" />
        </Suspense>

        <EffectComposer multisampling={4} enableNormalPass>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <SMAA />
        </EffectComposer>

        <OrbitControls 
          enabled={activeTool === 'view'} 
          makeDefault 
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={1}
          zoomSpeed={1}
          autoRotate={false}
          autoRotateSpeed={2}
          minDistance={10}
          maxDistance={200}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.45}
        />
      </Canvas>
    </div>
  );
};

export default Viewer3D;
