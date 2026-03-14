
import React, { Suspense, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Line, Sphere, AccumulativeShadows, RandomizedLight, useTexture, Center } from '@react-three/drei';
import { EffectComposer, SMAA as Smaa } from '@react-three/postprocessing';
import { Wrench } from 'lucide-react';
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import simplify from 'simplify-js';
import { Path3D, ToolMode } from '../types';
import { MainModel } from './models';
import { shaderTheme } from './shaders/globalShaderTheme';
import { createSkyMaterial } from './shaders/materialFactories';
import { GpuPicker } from './GpuPicker';
import MovementGamepad, { MovementDirection } from './MovementGamepad';
import { useThree } from '@react-three/fiber';


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
  deviceMode: 'desktop' | 'tablet';
}

type AxisIndex = 0 | 1 | 2;

type SimplifyPoint = {
  x: number;
  y: number;
  index: number;
};

let bvhPatched = false;

const ensureBvhRaycastAcceleration = () => {
  if (bvhPatched) return;
  (THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
  (THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
  (THREE.Mesh.prototype as any).raycast = acceleratedRaycast;
  bvhPatched = true;
};

const simplifyPointCloud3D = (points: THREE.Vector3[], tolerance: number) => {
  if (points.length <= 2) return points;

  const toPair = (
    getX: (point: THREE.Vector3) => number,
    getY: (point: THREE.Vector3) => number
  ): SimplifyPoint[] => {
    return points.map((point, index) => ({
      x: getX(point),
      y: getY(point),
      index,
    }));
  };

  const xy = simplify(toPair((point) => point.x, (point) => point.y), tolerance, false) as SimplifyPoint[];
  const yz = simplify(toPair((point) => point.y, (point) => point.z), tolerance, false) as SimplifyPoint[];
  const xz = simplify(toPair((point) => point.x, (point) => point.z), tolerance, false) as SimplifyPoint[];

  const keep = new Set<number>();
  keep.add(0);
  keep.add(points.length - 1);

  for (const item of xy) keep.add(item.index);
  for (const item of yz) keep.add(item.index);
  for (const item of xz) keep.add(item.index);

  const ordered = [...keep].sort((first, second) => first - second);
  if (ordered.length <= 2) {
    return [points[0], points.at(-1) ?? points[0]];
  }

  return ordered.map((index) => points[index]);
};

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
const Player = ({ playerRef, onPlayerMove, cameraYawRef, activeDirections }: {
  playerRef: React.RefObject<THREE.Group | null>;
  onPlayerMove: (position: THREE.Vector3) => void;
  cameraYawRef: React.RefObject<number>;
  activeDirections: Set<MovementDirection>;
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

    const keys = keysPressed.current;
    const isSprint = keys['shift'] || false;
    const speedBase = 0.2;
    const speed = isSprint ? speedBase * 2.5 : speedBase;
    const verticalSpeed = 0.15;
    const turnSpeed = 0.04;

    // Check both keyboard and gamepad
    const isForward = keys['w'] || keys['arrowup'] || activeDirections.has('forward');
    const isBackward = keys['s'] || keys['arrowdown'] || activeDirections.has('backward');
    const isLeft = keys['a'] || keys['arrowleft'] || activeDirections.has('left');
    const isRight = keys['d'] || keys['arrowright'] || activeDirections.has('right');
    const isStrafeLeft = keys['q'] || activeDirections.has('left'); // Overlapping with turn but useful
    const isStrafeRight = keys['e'] || activeDirections.has('right');
    const isUp = activeDirections.has('up');
    const isDown = activeDirections.has('down');

    // Rotate camera/player turning (A/D or Arrows)
    if (isLeft) cameraYawRef.current += turnSpeed;
    if (isRight) cameraYawRef.current -= turnSpeed;

    // Movement vector calculation
    const movement = new THREE.Vector3(0, 0, 0);

    // Forward/Backward logic
    if (isForward) movement.z -= 1;
    if (isBackward) movement.z += 1;

    // Strafe logic (Q/E or gamepad integration)
    // For gamepad, we'll treat horizontal as turning, but keyboard gets strafing
    if (keys['q']) movement.x -= 1;
    if (keys['e']) movement.x += 1;

    if (movement.lengthSq() > 0) {
      movement.normalize();
      movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current);
      movement.multiplyScalar(speed);
      playerRef.current.position.add(movement);
    }

    // Vertical movement
    if (isUp) {
      playerRef.current.position.y += verticalSpeed;
    }
    if (isDown) {
      playerRef.current.position.y = Math.max(0.78, playerRef.current.position.y - verticalSpeed);
    }

    // Clamp to field bounds (200x200 plane centered at origin)
    playerRef.current.position.x = Math.max(-100, Math.min(100, playerRef.current.position.x));
    playerRef.current.position.z = Math.max(-100, Math.min(100, playerRef.current.position.z));

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

// Handles Orbit mode movement via gamepad buttons
const OrbitMovementController = ({
  activeDirections,
  isPlayerMode,
  controlsRef,
  cameraRef,
  setOrbitTarget
}: {
  activeDirections: Set<MovementDirection>;
  isPlayerMode: boolean;
  controlsRef: React.RefObject<any>;
  cameraRef: React.RefObject<THREE.Camera | null>;
  setOrbitTarget: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
}) => {
  useFrame(() => {
    if (isPlayerMode || activeDirections.size === 0 || !controlsRef.current) return;

    const speed = 0.5;
    const verticalSpeed = 0.4;
    const camera = cameraRef.current;
    if (!camera) return;

    const offset = new THREE.Vector3();

    // Calculate movement relative to camera orientation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    // Project vectors onto XZ plane for horizontal movement
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    if (activeDirections.has('forward')) offset.add(forward.multiplyScalar(speed));
    if (activeDirections.has('backward')) offset.add(forward.multiplyScalar(-speed));
    if (activeDirections.has('left')) offset.add(right.multiplyScalar(-speed));
    if (activeDirections.has('right')) offset.add(right.multiplyScalar(speed));

    if (offset.lengthSq() > 0) {
      setOrbitTarget((prev) => {
        const current = prev || new THREE.Vector3(0, 0, 0);
        return current.clone().add(offset);
      });
    }

    if (activeDirections.has('up')) {
      setOrbitTarget((prev) => {
        const current = prev || new THREE.Vector3(0, 0, 0);
        return current.clone().add(new THREE.Vector3(0, verticalSpeed, 0));
      });
    }
    if (activeDirections.has('down')) {
      setOrbitTarget((prev) => {
        const current = prev || new THREE.Vector3(0, 0, 0);
        return current.clone().add(new THREE.Vector3(0, -verticalSpeed, 0));
      });
    }
  });

  return null;
};

// Equirectangular sky component
const EquirectangularSky = ({ rotation = [0, 0, 0], scale = 100, meshRef }: { rotation?: [number, number, number]; scale?: number; meshRef?: React.RefObject<THREE.Mesh | null> }) => {
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
    <mesh ref={meshRef} scale={[scale, scale, scale]} rotation={rotation}>
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
  onSetTarget,
  skyRef
}: {
  activeTool: ToolMode;
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  paths3D: Path3D[];
  onSetTarget: (point: THREE.Vector3) => void;
  skyRef: React.RefObject<THREE.Mesh | null>;
}) => {
  const { gl, scene, camera, size: canvasSize } = useThree();
  const gpuPicker = useMemo(() => new GpuPicker(), []);

  useEffect(() => {
    return () => gpuPicker.dispose();
  }, [gpuPicker]);

  const modelGroupRef = useRef<THREE.Group>(null);
  const annotationsRef = useRef<THREE.Group>(null);
  const brushRef = useRef<THREE.Mesh>(null);
  const hoverSphereRef = useRef<THREE.Group>(null); // Kept for picking pass concealment

  // Ref instead of state: zero React re-renders during drawing hot path
  const currentPointsRef = useRef<THREE.Vector3[]>([]);

  // Lazy-initialize the live-line Three.js objects once
  const liveLineGeoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  const liveLineMatRef = useRef<THREE.LineBasicMaterial>(new THREE.LineBasicMaterial({
    color: currentColor,
    polygonOffset: true,
    polygonOffsetFactor: -20,
    transparent: true,
    opacity: 0.9
  }));
  const liveLineObjRef = useRef<THREE.Line>(new THREE.Line(liveLineGeoRef.current, liveLineMatRef.current));

  const [hoverInfo, setHoverInfo] = useState<{ point: THREE.Vector3, normal: THREE.Vector3 } | null>(null);
  const isDrawing3D = useRef(false);
  const lastHoverTimeRef = useRef(0);
  const OFFSET_DISTANCE = 0.015;
  const HOVER_THROTTLE_MS = 16; // ~60fps for smoother iPad experience
  const DOUBLE_TAP_DELAY = 300; // ms

  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  // Precompute bounding spheres for all paths — only recalculated when paths change
  const boundsMap = useMemo(() => {
    const map = new Map<string, PathBounds>();
    for (const path of paths3D) {
      map.set(path.id, computePathBounds(path));
    }
    return map;
  }, [paths3D]);

  const upgradeToStandardMaterial = useCallback((material: THREE.Material) => {
    const source = material as any;
    if (source.userData?.__isStandard) return material as THREE.MeshStandardMaterial;

    const std = new THREE.MeshStandardMaterial({
      color: source.color?.clone?.() ?? new THREE.Color('#ffffff'),
      map: source.map ?? null,
      emissive: source.emissive?.clone?.() ?? new THREE.Color('#000000'),
      emissiveMap: source.emissiveMap ?? null,
      emissiveIntensity: source.emissiveIntensity ?? 1,
      normalMap: source.normalMap ?? null,
      normalScale: source.normalScale?.clone?.(),
      roughnessMap: source.roughnessMap ?? null,
      roughness: source.roughness ?? 1,
      metalnessMap: source.metalnessMap ?? null,
      metalness: source.metalness ?? 0,
      aoMap: source.aoMap ?? null,
      aoMapIntensity: source.aoMapIntensity ?? 1,
      alphaMap: source.alphaMap ?? null,
      envMap: source.envMap ?? null,
      envMapIntensity: source.envMapIntensity ?? 1,
      transparent: source.transparent ?? false,
      opacity: source.opacity ?? 1,
      side: source.side ?? THREE.FrontSide,
      vertexColors: source.vertexColors ?? false,
      depthWrite: source.depthWrite ?? true,
      depthTest: source.depthTest ?? true,
    });

    std.userData = source.userData
      ? { ...source.userData, __isStandard: true }
      : { __isStandard: true };
    std.needsUpdate = true;
    return std;
  }, []);

  const applyStandardMaterial = useCallback((root: THREE.Object3D) => {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if ((object as any).userData?.skipStandard) return;

      const geometry = object.geometry as THREE.BufferGeometry & {
        boundsTree?: unknown;
        computeBoundsTree?: () => void;
      };
      if (geometry && !geometry.boundsTree && typeof geometry.computeBoundsTree === 'function') {
        geometry.computeBoundsTree();
      }

      object.castShadow = true;
      object.receiveShadow = true;

      // Enable picking layer
      object.layers.enable(1);

      if (Array.isArray(object.material)) {
        object.material = object.material.map((mat) => upgradeToStandardMaterial(mat));
      } else if (object.material) {
        object.material = upgradeToStandardMaterial(object.material);
      }
    });
  }, [upgradeToStandardMaterial]);

  const getSurfacePointGPU = useCallback((mouse: { x: number; y: number }) => {
    // Hide annotations so they aren't picked
    const annosVisible = annotationsRef.current?.visible;
    const hoverVisible = hoverSphereRef.current?.visible;
    const skyVisible = skyRef.current?.visible;

    if (annotationsRef.current) annotationsRef.current.visible = false;
    if (hoverSphereRef.current) hoverSphereRef.current.visible = false;
    if (skyRef.current) skyRef.current.visible = false;

    const hit = gpuPicker.pick(gl, scene, camera, mouse);

    // Restore visibility
    if (annotationsRef.current) annotationsRef.current.visible = annosVisible ?? true;
    if (hoverSphereRef.current) hoverSphereRef.current.visible = hoverVisible ?? true;
    if (skyRef.current) skyRef.current.visible = skyVisible ?? true;

    if (!hit) return null;

    const point = hit.point.clone();
    const normal = hit.normal.clone();
    point.add(normal.multiplyScalar(OFFSET_DISTANCE));
    return { point, normal };
  }, [gl, scene, camera, gpuPicker]);

  const getSurfacePoint = useCallback((e: any) => {
    if (!e.point || !e.face) return null;
    const point = e.point.clone();
    const normal = e.face.normal.clone();
    // transformDirection applies the full world matrix (rotation + scale) and normalises,
    // fixing jitter caused by non-uniform scale in glTF models.
    normal.transformDirection(e.object.matrixWorld);
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
    // iPad Focus: Double tap detection logic
    if (activeTool === 'view') {
      const now = performance.now();
      const timeDiff = now - lastTapTimeRef.current;
      const dist = Math.sqrt(
        Math.pow(e.pointer.x - lastTapPosRef.current.x, 2) +
        Math.pow(e.pointer.y - lastTapPosRef.current.y, 2)
      );

      if (timeDiff < DOUBLE_TAP_DELAY && dist < 0.05) {
        // Detected double tap
        if (e.point) {
          onSetTarget(e.point.clone());
        }
        lastTapTimeRef.current = 0; // Reset
      } else {
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: e.pointer.x, y: e.pointer.y };
      }
      return;
    }

    if (activeTool === 'pencil3d' || activeTool === 'eraser3d') {
      e.stopPropagation();

      const mouse = {
        x: e.pointer.x,
        y: e.pointer.y
      };

      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        isDrawing3D.current = true;
        if (activeTool === 'pencil3d') {
          currentPointsRef.current = [surface.point];
        } else {
          eraseAt(surface.point);
        }
      }
    }
  }, [activeTool, getSurfacePointGPU, eraseAt, onSetTarget]);

  const handleDoubleClick = useCallback((e: any) => {
    if (activeTool !== 'view') return;
    e.stopPropagation();
    if (e.point) {
      onSetTarget(e.point.clone());
    }
  }, [activeTool, onSetTarget]);

  const handlePointerMove = useCallback((e: any) => {
    const now = performance.now();

    const mouse = {
      x: e.pointer.x,
      y: e.pointer.y
    };

    if (now - lastHoverTimeRef.current > HOVER_THROTTLE_MS) {
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        setHoverInfo(surface);
      } else {
        setHoverInfo(null);
      }
      lastHoverTimeRef.current = now;
    }

    if (isDrawing3D.current) {
      if (activeTool === 'pencil3d') {
        const surface = getSurfacePointGPU(mouse);
        if (surface) {
          const lastPoint = currentPointsRef.current.at(-1);
          if (!lastPoint || surface.point.distanceTo(lastPoint) > 0.02) {
            currentPointsRef.current.push(surface.point);
          }
        }
      } else if (activeTool === 'eraser3d') {
        const surface = getSurfacePointGPU(mouse);
        if (surface) {
          eraseAt(surface.point);
        }
      }
    }
  }, [activeTool, getSurfacePointGPU, eraseAt]);

  // We still need a global pointerup to finish the stroke if the mouse leaves the mesh
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDrawing3D.current) {
        if (currentPointsRef.current.length > 1 && activeTool === 'pencil3d') {
          const simplifyTolerance = Math.min(0.01, Math.max(0.002, pencilWidth / 1000));
          const simplifiedPoints = simplifyPointCloud3D(currentPointsRef.current, simplifyTolerance);
          onAddPath3D({
            id: Math.random().toString(36).substring(2, 11),
            points: simplifiedPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
            color: currentColor,
            width: pencilWidth
          });
        }
        isDrawing3D.current = false;
        currentPointsRef.current = [];
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [activeTool, currentColor, pencilWidth, onAddPath3D]);

  useEffect(() => {
    if (modelGroupRef.current) {
      applyStandardMaterial(modelGroupRef.current);
    }
  }, [applyStandardMaterial]);

  // Sync live-line material colour when the user changes colour between strokes
  useEffect(() => {
    if (liveLineMatRef.current) {
      liveLineMatRef.current.color.set(currentColor);
    }
  }, [currentColor]);

  useEffect(() => {
    return () => {
      liveLineGeoRef.current?.dispose();
      liveLineMatRef.current?.dispose();
      if (!modelGroupRef.current) return;
      modelGroupRef.current.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const geometry = object.geometry as THREE.BufferGeometry & { disposeBoundsTree?: () => void };
        if (typeof geometry.disposeBoundsTree === 'function') {
          geometry.disposeBoundsTree();
        }
      });
    };
  }, []);

  // Imperatively update the in-progress line geometry every frame — no React state involved
  useFrame(() => {
    // Update brush orientation and position
    if (brushRef.current && hoverInfo) {
      brushRef.current.position.copy(hoverInfo.point);
      brushRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hoverInfo.normal);
    }

    if (!liveLineObjRef.current || !liveLineGeoRef.current) return;
    const pts = currentPointsRef.current;
    if (pts.length < 2) {
      liveLineObjRef.current.visible = false;
      return;
    }
    liveLineObjRef.current.visible = true;
    (liveLineObjRef.current.material as THREE.LineBasicMaterial).color.set(currentColor);

    const arr = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      arr[i * 3] = pts[i].x;
      arr[i * 3 + 1] = pts[i].y;
      arr[i * 3 + 2] = pts[i].z;
    }
    const geo = liveLineGeoRef.current;
    const existing = geo.getAttribute('position') as THREE.BufferAttribute | null;
    if (existing?.array.length === arr.length) {
      (existing.array as Float32Array).set(arr);
      existing.needsUpdate = true;
    } else {
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    }
  });

  return (
    <>
      <group ref={modelGroupRef} scale={1} onPointerLeave={() => setHoverInfo(null)}>
        <Center>
          <MainModel
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onDoubleClick={handleDoubleClick}
          />
        </Center>
      </group>

      {hoverInfo && (activeTool === 'pencil3d' || activeTool === 'eraser3d') && (
        <group ref={hoverSphereRef}>
          <mesh ref={brushRef}>
            <ringGeometry args={[
              (activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200) * 0.8,
              activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200,
              32
            ]} />
            <meshBasicMaterial
              color={activeTool === 'eraser3d' ? shaderTheme.model.red : currentColor}
              transparent
              opacity={0.8}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Imperative live-line preview — geometry updated by useFrame, zero React re-renders during draw */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <group ref={annotationsRef}>
        <primitive object={liveLineObjRef.current} />
        <LineGroup paths3D={paths3D} />
      </group>
    </>
  );
};

const isMobile = navigator.maxTouchPoints > 1;

const Viewer3D: React.FC<Viewer3DProps> = ({
  isDrawingMode,
  activeTool,
  isPlayerMode,
  paths3D,
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth,
  deviceMode,
}) => {
  useEffect(() => {
    ensureBvhRaycastAcceleration();
  }, []);

  const lightRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const playerRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const cameraYawRef = useRef(0);
  const [orbitTarget, setOrbitTarget] = useState<THREE.Vector3 | null>(null);
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 1, 0));
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [directionalIntensity, setDirectionalIntensity] = useState(2.5);
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [skyRotation, setSkyRotation] = useState<[number, number, number]>([0, 0, 0.0]);
  const [skyScale, setSkyScale] = useState(220);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [fogDistance, setFogDistance] = useState(480);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([-120, 0, 0]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [maxOrbitDistance, setMaxOrbitDistance] = useState(125);
  const [cameraFov, setCameraFov] = useState(50);
  const [activeMovementDirections, setActiveMovementDirections] = useState<Set<MovementDirection>>(new Set());

  const handleGamepadInput = useCallback((direction: MovementDirection, active: boolean) => {
    setActiveMovementDirections((prev) => {
      const next = new Set(prev);
      if (active) next.add(direction);
      else next.delete(direction);
      return next;
    });
  }, []);

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
      {/* Scene Controls Button */}
      <button
        onClick={() => setShowSceneControls((prev) => !prev)}
        className={`absolute bottom-5 ${deviceMode === 'tablet' ? 'right-5' : 'left-5'} z-30 h-9 w-9 rounded-md border border-[#3c3c3c] bg-[#252526]/95 text-[#c5c5c5] hover:bg-[#2d2d30] flex items-center justify-center`}
        title="Scene controls"
      >
        <Wrench size={16} />
      </button>

      {showSceneControls && (
        <div className={`absolute bottom-16 ${deviceMode === 'tablet' ? 'right-5' : 'left-5'} z-30 w-72 border border-[#3c3c3c] bg-[#252526]/95 text-[#cccccc] rounded-md p-3 shadow-2xl space-y-3`}>
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
        camera={{ position: isPlayerMode ? [0, 5, 8] : cameraPosition, fov: cameraFov, near: 0.1, far: 1000 }}
        dpr={[1, 1.5]}
        shadows="soft"
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
        onCreated={({ camera, raycaster }) => {
          (raycaster as any).firstHitOnly = true;
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
        <OrbitMovementController
          activeDirections={activeMovementDirections}
          isPlayerMode={isPlayerMode}
          controlsRef={controlsRef}
          cameraRef={cameraRef}
          setOrbitTarget={setOrbitTarget}
        />
        <EquirectangularSky rotation={skyRotation} scale={skyScale} meshRef={skyRef} />
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
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={10}
          shadow-camera-far={600}
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
          shadow-bias={-0.0005}
        />
        {/* eslint-enable react/no-unknown-property */}

        {/* eslint-disable-next-line react/no-unknown-property */}
        <axesHelper args={[8]} position={cameraTarget} />


        <Suspense fallback={<Loader />}>

          {isPlayerMode && (
            <>
              <Player playerRef={playerRef} onPlayerMove={setPlayerPosition} cameraYawRef={cameraYawRef} activeDirections={activeMovementDirections} />
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
            skyRef={skyRef}
          />
        </Suspense>

        {/* Post-processing effects for better visual quality */}
        <EffectComposer multisampling={4}>
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

      {deviceMode === 'tablet' && (
        <MovementGamepad
          activeDirections={activeMovementDirections}
          onDirectionChange={handleGamepadInput}
        />
      )}
    </div>
  );
};

export default Viewer3D;
