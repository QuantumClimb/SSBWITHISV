
import React, { Suspense, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Line, Sphere, ContactShadows, useTexture, Grid } from '@react-three/drei';
import { EffectComposer, SMAA as Smaa } from '@react-three/postprocessing';
import { Wrench } from 'lucide-react';
import * as THREE from 'three';
import { Path3D, ToolMode } from '../types';
import { MainModel } from './models';
import { nearestPaletteColor, shaderTheme } from './shaders/globalShaderTheme';
import { createGroundBlendTexture, createGroundMaterial, createSkyMaterial } from './shaders/materialFactories';


interface Viewer3DProps {
  isDrawingMode: boolean;
  activeTool: ToolMode;
  isPlayerMode: boolean;
  paths3D: Path3D[];
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
}

type AxisIndex = 0 | 1 | 2;

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

// Third-person player controller
const Player = ({ playerRef, onPlayerMove, cameraYawRef }: {
  playerRef: React.RefObject<THREE.Group | null>;
  onPlayerMove: (position: THREE.Vector3) => void;
  cameraYawRef: React.RefObject<number>;
}) => {
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    globalThis.addEventListener('keyup', handleKeyUp);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      globalThis.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    if (!playerRef.current) return;

    const speed = 0.2;
    const turnSpeed = 0.04;
    const keys = keysPressed.current;
    const forward = new THREE.Vector3(0, 0, -1);

    // Rotate camera with A/D or ArrowLeft/ArrowRight
    if (keys['a'] || keys['arrowleft']) cameraYawRef.current += turnSpeed;
    if (keys['d'] || keys['arrowright']) cameraYawRef.current -= turnSpeed;

    // Move forward/back with W/S or ArrowUp/ArrowDown
    let moveAmount = 0;
    if (keys['w'] || keys['arrowup']) moveAmount += speed;
    if (keys['s'] || keys['arrowdown']) moveAmount -= speed;

    if (moveAmount !== 0) {
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current);
      const movement = forward.multiplyScalar(moveAmount);
      playerRef.current.position.add(movement);

      // Clamp to field bounds (200x200 plane centered at origin)
      playerRef.current.position.x = Math.max(-100, Math.min(100, playerRef.current.position.x));
      playerRef.current.position.z = Math.max(-100, Math.min(100, playerRef.current.position.z));
    }

    onPlayerMove(playerRef.current.position.clone());
  });

  return (
    // eslint-disable-next-line react/no-unknown-property
    <group ref={playerRef} position={[0, 0.78, 0]} scale={0.78}>
      {/* Player body - capsule shape */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <mesh position={[0, 0, 0]}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <capsuleGeometry args={[0.3, 1.4, 8, 8]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meshStandardMaterial color={shaderTheme.model.blue} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Player head */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <mesh position={[0, 1, 0]}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <sphereGeometry args={[0.25, 16, 16]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meshStandardMaterial color={shaderTheme.model.white} roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
};

// Camera that follows the player in third-person view
const PlayerCamera = ({ playerPosition, cameraRef, cameraYawRef }: {
  playerPosition: THREE.Vector3;
  cameraRef: React.RefObject<THREE.Camera | null>;
  cameraYawRef: React.RefObject<number>;
}) => {
  const smoothPosition = useRef(new THREE.Vector3(0, 5, 8));
  const smoothLookAt = useRef(new THREE.Vector3(0, 0.8, 0));

  useFrame(({ camera }) => {
    if (!playerPosition) return;
    
    const offset = new THREE.Vector3(0, 3.5, 6);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current);
    const desiredPosition = playerPosition.clone().add(offset);
    const desiredLookAt = playerPosition.clone();
    desiredLookAt.y += 0.8;
    
    // Smooth exponential damping for position (higher factor = smoother)
    smoothPosition.current.lerp(desiredPosition, 0.08);
    camera.position.copy(smoothPosition.current);
    
    // Smooth look-at target
    smoothLookAt.current.lerp(desiredLookAt, 0.12);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
};

// Equirectangular sky component
const EquirectangularSky = ({ rotation = [0, 0, 0], scale = 100 }: { rotation?: [number, number, number]; scale?: number }) => {
  const texture = useTexture('/SKY.png');
  const material = useMemo(() => createSkyMaterial(texture), [texture]);

  useEffect(() => {
    if (texture) {
      // Enable linear filtering for smoother appearance
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      
      // Request GPU to generate mipmaps for better quality at distance
      texture.generateMipmaps = true;
      
      // Anisotropic filtering for improved quality when viewed at an angle
      texture.anisotropy = 16;
      
      // Mark texture as updated
      texture.needsUpdate = true;
    }
  }, [texture]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    // eslint-disable-next-line react/no-unknown-property
    <mesh scale={[scale, scale, scale]} rotation={rotation}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <sphereGeometry args={[1, 128, 128]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={material} attach="material" />
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
  for (const point of pts) {
    cx += point.x; cy += point.y; cz += point.z;
  }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let maxRSq = 0;
  for (const point of pts) {
    const dx = point.x - cx, dy = point.y - cy, dz = point.z - cz;
    const dSq = dx * dx + dy * dy + dz * dz;
    if (dSq > maxRSq) maxRSq = dSq;
  }
  return { cx, cy, cz, radius: Math.sqrt(maxRSq) };
}

// Smoothly animates OrbitControls target to a new point
const SmoothTarget = ({ controlsRef, targetPoint }: {
  controlsRef: React.RefObject<any>;
  targetPoint: THREE.Vector3 | null;
}) => {
  const animating = useRef(false);
  const startTarget = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());
  const progress = useRef(0);

  useEffect(() => {
    if (targetPoint && controlsRef.current) {
      startTarget.current.copy(controlsRef.current.target);
      endTarget.current.copy(targetPoint);
      progress.current = 0;
      animating.current = true;
    }
  }, [targetPoint, controlsRef]);

  useFrame(() => {
    if (!animating.current || !controlsRef.current) return;
    progress.current = Math.min(progress.current + 0.04, 1);
    const t = 1 - Math.pow(1 - progress.current, 3); // ease-out cubic
    controlsRef.current.target.lerpVectors(startTarget.current, endTarget.current, t);
    controlsRef.current.update();
    if (progress.current >= 1) animating.current = false;
  });

  return null;
};

const ModelWithAnnotations = ({
  activeTool,
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth,
  paths3D,
  onSetTarget
}: {
  activeTool: ToolMode;
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  paths3D: Path3D[];
  onSetTarget: (point: THREE.Vector3) => void;
}) => {
  const modelGroupRef = useRef<THREE.Group>(null);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{point: THREE.Vector3, normal: THREE.Vector3} | null>(null);
  const isDrawing3D = useRef(false);
  const lastHoverTimeRef = useRef(0);
  const OFFSET_DISTANCE = 0.015;
  const HOVER_THROTTLE_MS = 16; // ~60fps
  const groundTexture = useMemo(() => createGroundBlendTexture(), []);
  const groundMaterial = useMemo(() => createGroundMaterial(groundTexture), [groundTexture]);

  useEffect(() => {
    return () => {
      groundMaterial.dispose();
      groundTexture.dispose();
    };
  }, [groundMaterial, groundTexture]);

  // Precompute bounding spheres for all paths — only recalculated when paths change
  const boundsMap = useMemo(() => {
    const map = new Map<string, PathBounds>();
    for (const path of paths3D) {
      map.set(path.id, computePathBounds(path));
    }
    return map;
  }, [paths3D]);

  const createToonMaterial = useCallback((material: THREE.Material, quantizeToModelPalette = false) => {
    const source = material as any;
    if (source.userData?.__isToon) return material as THREE.MeshToonMaterial;

    const sourceColor = source.color?.clone?.() ?? new THREE.Color('#ffffff');
    const toonColor = quantizeToModelPalette
      ? nearestPaletteColor(sourceColor, shaderTheme.model)
      : sourceColor;

    const toon = new THREE.MeshToonMaterial({
      color: toonColor,
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

      const quantizeToModelPalette = false;

      object.castShadow = false;
      object.receiveShadow = false;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((mat) => createToonMaterial(mat, quantizeToModelPalette));
      } else if (object.material) {
        object.material = createToonMaterial(object.material, quantizeToModelPalette);
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
    for (const point of pts) {
      const dx = point.x - px;
      const dy = point.y - py;
      const dz = point.z - pz;
      if (dx * dx + dy * dy + dz * dz < radiusSq) return true;
    }
    return false;
  }, [boundsMap]);

  const eraseAt = useCallback((point: THREE.Vector3) => {
    const eraserRadius = eraserWidth / 40;
    const px = point.x, py = point.y, pz = point.z;
    for (const path of paths3D) {
      if (checkPathIntersection(path, px, py, pz, eraserRadius)) {
        onRemovePath3D(path.id);
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

  const handleDoubleClick = useCallback((e: any) => {
    if (activeTool !== 'view') return;
    e.stopPropagation();
    if (e.point) {
      onSetTarget(e.point.clone());
    }
  }, [activeTool, onSetTarget]);

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
    <group ref={modelGroupRef} scale={0.8} onPointerLeave={() => setHoverInfo(null)}>
      <MainModel
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
      />

      {/* Ground plane - also drawable with 3D pencil */}
      {/* eslint-disable react/no-unknown-property */}
      <mesh
        position={[0, -0.65, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        userData={{ shaderSurface: 'terrain' }}
        material={groundMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
      >
        {/* eslint-disable-next-line react/no-unknown-property */}
        <planeGeometry args={[200, 200]} />
      </mesh>
      {/* eslint-enable react/no-unknown-property */}
      
      {hoverInfo && (activeTool === 'pencil3d' || activeTool === 'eraser3d') && (
        // eslint-disable-next-line react/no-unknown-property
        <Sphere
          args={[activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200, 8, 8]}
          position={hoverInfo.point}
          userData={{ skipToon: true }}
        >
          {/* eslint-disable react/no-unknown-property */}
          <meshBasicMaterial 
            color={activeTool === 'eraser3d' ? shaderTheme.model.red : currentColor}
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
  isPlayerMode,
  paths3D, 
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const controlsRef = useRef<any>(null);
  const playerRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const cameraYawRef = useRef(0);
  const [orbitTarget, setOrbitTarget] = useState<THREE.Vector3 | null>(null);
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 1, 0));
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [directionalIntensity, setDirectionalIntensity] = useState(1.45);
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [skyRotation, setSkyRotation] = useState<[number, number, number]>([0, 0, 0.11]);
  const [skyScale, setSkyScale] = useState(125);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [fogDistance, setFogDistance] = useState(480);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([-90, 0, 0]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [maxOrbitDistance, setMaxOrbitDistance] = useState(80);
  const [cameraFov, setCameraFov] = useState(60);

  const { sunPosition, sunColor, sunIntensity } = useMemo(() => {
    // Fixed sun position (14:00 / 2pm)
    const sunPos = new THREE.Vector3(130, 150, 130);
    const color = new THREE.Color(shaderTheme.sun.color);
    const intensity = 1.2;

    return { sunPosition: [sunPos.x, sunPos.y, sunPos.z] as [number, number, number], sunColor: color, sunIntensity: intensity };
  }, []);

  useEffect(() => {
    if (isPlayerMode || !cameraRef.current) return;
    cameraRef.current.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
  }, [cameraPosition, isPlayerMode]);

  useEffect(() => {
    if (isPlayerMode || !controlsRef.current) return;
    controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    controlsRef.current.update();
  }, [cameraTarget, isPlayerMode]);

  useEffect(() => {
    if (!cameraRef.current) return;
    if (cameraRef.current instanceof THREE.PerspectiveCamera) {
      cameraRef.current.fov = cameraFov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraFov]);

  useEffect(() => {
    if (!orbitTarget) return;
    setCameraTarget([orbitTarget.x, orbitTarget.y, orbitTarget.z]);
  }, [orbitTarget]);

  const updateAxis = (
    setter: React.Dispatch<React.SetStateAction<[number, number, number]>>,
    axis: AxisIndex,
    value: number
  ) => {
    setter((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[axis] = value;
      return next;
    });
  };




  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900">
      <button
        onClick={() => setShowSceneControls((prev) => !prev)}
        className="absolute bottom-5 left-5 z-30 h-9 w-9 rounded-md border border-[#3c3c3c] bg-[#252526]/95 text-[#c5c5c5] hover:bg-[#2d2d30] flex items-center justify-center"
        title="Scene controls"
      >
        <Wrench size={16} />
      </button>

      {showSceneControls && (
        <div className="absolute bottom-16 left-5 z-30 w-72 border border-[#3c3c3c] bg-[#252526]/95 text-[#cccccc] rounded-md p-3 shadow-2xl space-y-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#c5c5c5]">Scene</div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Sky</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Rotation Z</span>
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step="0.01"
                value={skyRotation[2]}
                onChange={(e) => setSkyRotation([skyRotation[0], skyRotation[1], Number.parseFloat(e.target.value)])}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{skyRotation[2].toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Scale</span>
              <input
                type="range"
                min="50"
                max="220"
                step="1"
                value={skyScale}
                onChange={(e) => setSkyScale(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{skyScale}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Mist</div>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={fogEnabled}
                onChange={(e) => setFogEnabled(e.target.checked)}
                className="accent-[#007acc]"
              />
              <span>Enabled</span>
            </label>
            {fogEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] w-16 text-[#9d9d9d]">Distance</span>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="10"
                  value={fogDistance}
                  onChange={(e) => setFogDistance(Number.parseFloat(e.target.value))}
                  className="flex-1 accent-[#007acc]"
                />
                <span className="text-[11px] w-10 text-right">{fogDistance}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Lighting</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Direct</span>
              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={directionalIntensity}
                onChange={(e) => setDirectionalIntensity(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{directionalIntensity.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Ambient</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={ambientIntensity}
                onChange={(e) => setAmbientIntensity(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{ambientIntensity.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Camera Axis</div>
            <div className="text-[11px] text-[#9d9d9d]">Position</div>
            <div className="grid grid-cols-3 gap-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <input
                  key={`pos-${axis}`}
                  type="number"
                  step="0.1"
                  value={cameraPosition[index]}
                  onChange={(e) => updateAxis(setCameraPosition, index as AxisIndex, Number.parseFloat(e.target.value || '0'))}
                  className="h-8 px-2 text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm outline-none focus:border-[#007acc]"
                  title={`Camera ${axis}`}
                />
              ))}
            </div>

            <div className="text-[11px] text-[#9d9d9d]">Target</div>
            <div className="grid grid-cols-3 gap-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <input
                  key={`target-${axis}`}
                  type="number"
                  step="0.1"
                  value={cameraTarget[index]}
                  onChange={(e) => updateAxis(setCameraTarget, index as AxisIndex, Number.parseFloat(e.target.value || '0'))}
                  className="h-8 px-2 text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm outline-none focus:border-[#007acc]"
                  title={`Target ${axis}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Zoom Limit</span>
              <input
                type="range"
                min="40"
                max="200"
                step="5"
                value={maxOrbitDistance}
                onChange={(e) => setMaxOrbitDistance(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{maxOrbitDistance}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">FOV</span>
              <input
                type="range"
                min="20"
                max="120"
                step="1"
                value={cameraFov}
                onChange={(e) => setCameraFov(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#007acc]"
              />
              <span className="text-[11px] w-10 text-right">{cameraFov}</span>
            </div>
          </div>
        </div>
      )}

      <Canvas 
        camera={{ position: isPlayerMode ? [0, 5, 8] : cameraPosition, fov: cameraFov, near: 0.1, far: 10000 }} 
        dpr={[1, 1.5]}
        style={{ touchAction: 'none' }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = cameraFov;
            camera.updateProjectionMatrix();
          }
          if (!isPlayerMode) {
            camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
            camera.lookAt(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
          }
        }}
      >
        <EquirectangularSky rotation={skyRotation} scale={skyScale} />
        {fogEnabled && (
          // eslint-disable-next-line react/no-unknown-property
          <fog attach="fog" args={[shaderTheme.sky.mistColor, 10, fogDistance]} />
        )}
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

        <Grid
          position={[0, -0.66, 0]}
          args={[10, 10]}
          cellSize={1}
          cellThickness={0.6}
          sectionSize={10}
          sectionThickness={1.4}
          sectionColor={shaderTheme.ground.dirt}
          cellColor={shaderTheme.grass.base}
          fadeDistance={250}
          fadeStrength={1}
          infiniteGrid
        />

        {/* eslint-disable-next-line react/no-unknown-property */}
        <axesHelper args={[8]} position={cameraTarget} />

        
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
          
          {isPlayerMode && (
            <>
              <Player playerRef={playerRef} onPlayerMove={setPlayerPosition} cameraYawRef={cameraYawRef} />
              <PlayerCamera playerPosition={playerPosition} cameraRef={cameraRef} cameraYawRef={cameraYawRef} />
            </>
          )}

          <ModelWithAnnotations
              activeTool={activeTool}
              onAddPath3D={onAddPath3D}
              onRemovePath3D={onRemovePath3D}
              currentColor={currentColor}
              pencilWidth={pencilWidth}
              eraserWidth={eraserWidth}
              paths3D={paths3D}
              onSetTarget={setOrbitTarget}
            />
            <LineGroup paths3D={paths3D} />
          <Environment preset="sunset" />
        </Suspense>

        <EffectComposer multisampling={4} enableNormalPass>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <Smaa />
        </EffectComposer>

        {!isPlayerMode && (
          <>
            <SmoothTarget controlsRef={controlsRef} targetPoint={orbitTarget} />
            <OrbitControls
              ref={controlsRef}
              enabled={activeTool === 'view'}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={1}
              zoomSpeed={1}
              autoRotate={false}
              autoRotateSpeed={2}
              minDistance={10}
              maxDistance={maxOrbitDistance}
              minPolarAngle={0}
              maxPolarAngle={Math.PI * 0.45}
            />
          </>
        )}
      </Canvas>
    </div>
  );
};

export default Viewer3D;
