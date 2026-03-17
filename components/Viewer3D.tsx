
import React, { Suspense, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Line, Sphere, AccumulativeShadows, RandomizedLight, useTexture, Center, ContactShadows } from '@react-three/drei';
import { EffectComposer, SMAA as Smaa } from '@react-three/postprocessing';
import { Wrench, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import simplify from 'simplify-js';
import { Path3D, ToolMode, CameraMode, Measurement, PlacedObject, ObjectType, UnitSystem } from '../types';
import { MainModel, Man } from './models';
import Minimap from './Minimap';
import { shaderTheme } from './shaders/globalShaderTheme';
import { createSkyMaterial } from './shaders/materialFactories';
import { GpuPicker } from './GpuPicker';
import { useThree } from '@react-three/fiber';


interface Viewer3DProps {
  isDrawingMode: boolean;
  activeTool: ToolMode;
  paths3D: Path3D[];
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  cameraMode: CameraMode;
  onClear: () => void;
  showSceneControls: boolean;
  setShowSceneControls: (show: boolean) => void;
  measurements: Measurement[];
  onAddMeasurement: (m: Measurement) => void;
  onRemoveMeasurement: (id: string) => void;
  placedObjects: PlacedObject[];
  onAddPlacedObject: (obj: PlacedObject) => void;
  onRemovePlacedObject: (id: string) => void;
  selectedObjectType: ObjectType;
  unitSystem: UnitSystem;
  setUnitSystem: (u: UnitSystem) => void;
  onToolChange: (tool: ToolMode) => void;
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
          dashed
          dashScale={10}
          dashSize={1.5}
          gapSize={0.8}
          polygonOffset
          polygonOffsetFactor={-15}
        />
      ))}
    </>
  );
});

LineGroup.displayName = 'LineGroup';





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

const EnvironmentManager = () => {
  const envTexture = useTexture('/SKY.png');
  useEffect(() => {
    if (envTexture) envTexture.mapping = THREE.EquirectangularReflectionMapping;
  }, [envTexture]);
  return <Environment map={envTexture} environmentIntensity={0.4} />;
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




const Plank = ({ start, end, color }: { start: THREE.Vector3, end: THREE.Vector3, color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh position={midPoint} quaternion={quaternion} ref={meshRef}>
      <boxGeometry args={[1, distance, 0.2]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const CursorReticle = ({ position, normal, color, type }: { position: THREE.Vector3, normal: THREE.Vector3, color: string, type: 'focus' | 'measure' }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Align with surface normal
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  return (
    <group position={position} quaternion={quaternion} ref={meshRef}>
      {type === 'focus' ? (
        // Crosshair for Focus
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.45, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[1.2, 0.05, 0.05]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <boxGeometry args={[1.2, 0.05, 0.05]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ) : (
        // Target for Measurement
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.25, 32]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const PlacementRenderer = ({ objects }: { objects: PlacedObject[] }) => {
  return (
    <group>
      {objects.map((obj) => {
        const pos = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
        const rot = new THREE.Euler(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        const scale = new THREE.Vector3(obj.scale.x, obj.scale.y, obj.scale.z);

        if (obj.type === 'cylinder') {
          return (
            <mesh key={obj.id} position={pos} rotation={rot} scale={scale}>
              <cylinderGeometry args={[0.5, 0.5, 2, 32]} />
              <meshStandardMaterial color={obj.color} />
            </mesh>
          );
        }

        if (obj.type === 'plank' && obj.points && obj.points.length >= 2) {
          const start = new THREE.Vector3(obj.points[0].x, obj.points[0].y, obj.points[0].z);
          const end = new THREE.Vector3(obj.points[1].x, obj.points[1].y, obj.points[1].z);
          return <Plank key={obj.id} start={start} end={end} color={obj.color} />;
        }

        if (obj.type === 'rope' && obj.points && obj.points.length >= 2) {
          const points = obj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
          return (
            <Line
              key={obj.id}
              points={points}
              color={obj.color}
              lineWidth={5}
            />
          );
        }

        return null;
      })}
    </group>
  );
};

const ModelWithAnnotations = ({
  activeTool,
  onAddPath3D,
  onRemovePath3D,
  currentColor,
  pencilWidth,
  eraserWidth,
  paths3D,
  skyRef,
  setActivePointCount,
  setRaycastLatency,
  onTargetsUpdate,
  measurements,
  onAddMeasurement,
  onRemoveMeasurement,
  placedObjects,
  onAddPlacedObject,
  onRemovePlacedObject,
  selectedObjectType,
  targetPosRef,
  targetLookAtRef,
  isAnimatingCamera,
  controlsRef,
  cameraRef,
  unitSystem,
  onToolChange,
  cameraMode,
  isPlayerSpawned,
  setIsPlayerSpawned,
  lastPlayerPosition,
  lastPlayerRotation,
}: {
  activeTool: ToolMode;
  onAddPath3D: (path: Path3D) => void;
  onRemovePath3D: (id: string) => void;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  paths3D: Path3D[];
  skyRef: React.RefObject<THREE.Mesh | null>;
  setActivePointCount: (count: number) => void;
  setRaycastLatency: (latency: number) => void;
  onTargetsUpdate?: (targets: Record<string, [number, number, number]>) => void;
  measurements: Measurement[];
  onAddMeasurement: (m: Measurement) => void;
  onRemoveMeasurement: (id: string) => void;
  placedObjects: PlacedObject[];
  onAddPlacedObject: (obj: PlacedObject) => void;
  onRemovePlacedObject: (id: string) => void;
  selectedObjectType: ObjectType;
  targetPosRef: React.RefObject<THREE.Vector3 | null>;
  targetLookAtRef: React.RefObject<THREE.Vector3 | null>;
  isAnimatingCamera: React.RefObject<boolean>;
  controlsRef: React.RefObject<any>;
  cameraRef: React.RefObject<THREE.Camera | null>;
  unitSystem: UnitSystem;
  onToolChange: (tool: ToolMode) => void;
  cameraMode: CameraMode;
  isPlayerSpawned: boolean;
  setIsPlayerSpawned: (s: boolean) => void;
  lastPlayerPosition: React.MutableRefObject<THREE.Vector3>;
  lastPlayerRotation: React.MutableRefObject<THREE.Euler>;
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
  
  // Hover state for cursors/reticles
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [hoverNormal, setHoverNormal] = useState<THREE.Vector3 | null>(null);

  // Lazy-initialize the live-line Three.js objects once
  const liveLineGeoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  const liveLineMatRef = useRef<THREE.LineDashedMaterial>(new THREE.LineDashedMaterial({
    color: currentColor,
    scale: 10,
    dashSize: 1.5,
    gapSize: 0.8,
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
  const HOVER_THROTTLE_MS = 30; // ~33fps for smoother iPad experience
  const DOUBLE_TAP_DELAY = 300; // ms

  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  // Measurement state
  const [tempMeasurement, setTempMeasurement] = useState<{ start: THREE.Vector3; end: THREE.Vector3 | null } | null>(null);
  const [tempPlacement, setTempPlacement] = useState<THREE.Vector3[]>([]);

  // Precompute bounding spheres for all paths — only recalculated when paths change
  const boundsMap = useMemo(() => {
    const map = new Map<string, PathBounds>();
    for (const path of paths3D) {
      map.set(path.id, computePathBounds(path));
    }
    return map;
  }, [paths3D]);

  // upgradeToStandardMaterial was previously used here but it was stripping native GLB textures.
  // We'll preserve it as a reference if needed, but we'll stop using it in the main flow.
  const upgradeToStandardMaterial = useCallback((material: THREE.Material) => {
    return material; // Just return original to preserve textures
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

      // We no longer replace materials to avoid stripping GLB textures.
      // We just ensure the existing material has what it needs for shadows if it's a standard-ish material.
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          if ('needsUpdate' in mat) mat.needsUpdate = true;
        });
      } else if (object.material) {
        if ('needsUpdate' in object.material) object.material.needsUpdate = true;
      }
    });
  }, []);

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

  const getSurfacePointRaycast = useCallback((mouse: { x: number; y: number }) => {
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2(mouse.x, mouse.y);
    raycaster.setFromCamera(mouseVec, camera);
    (raycaster as any).firstHitOnly = true;

    // We only want to hit the model, not annotations or sky
    // modelGroupRef.current usually has the MainModel
    if (!modelGroupRef.current) return null;

    const intersects = raycaster.intersectObject(modelGroupRef.current, true);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const point = hit.point.clone();
    const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    
    // Transform normal to world space if it's from a mesh
    if (hit.object instanceof THREE.Mesh) {
      normal.transformDirection(hit.object.matrixWorld);
    }

    point.add(normal.multiplyScalar(OFFSET_DISTANCE));
    return { point, normal };
  }, [camera]);

  const eraseAt = useCallback((point: THREE.Vector3) => {
    const eraserRadius = eraserWidth / 40;
    const px = point.x, py = point.y, pz = point.z;
    const eraserRadiusSq = eraserRadius * eraserRadius;

    // 1. Erase Paths
    for (const path of paths3D) {
      if (checkPathIntersection(path, px, py, pz, eraserRadius)) {
        onRemovePath3D(path.id);
      }
    }

    // 2. Erase Measurements
    for (const m of measurements) {
      const start = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
      const end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
      if (start.distanceToSquared(point) < eraserRadiusSq || end.distanceToSquared(point) < eraserRadiusSq) {
        onRemoveMeasurement(m.id);
      }
    }

    // 3. Erase Placed Objects
    for (const obj of placedObjects) {
      if (obj.points) {
        // Multi-point objects (Plank, Rope)
        for (const p of obj.points) {
          const v = new THREE.Vector3(p.x, p.y, p.z);
          if (v.distanceToSquared(point) < eraserRadiusSq) {
            onRemovePlacedObject(obj.id);
            break;
          }
        }
      } else {
        // Single point objects (Cylinder)
        const v = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
        if (v.distanceToSquared(point) < eraserRadiusSq) {
          onRemovePlacedObject(obj.id);
        }
      }
    }
  }, [paths3D, measurements, placedObjects, eraserWidth, checkPathIntersection, onRemovePath3D, onRemoveMeasurement, onRemovePlacedObject]);

  const handlePointerDown = useCallback((e: any) => {
    if (activeTool === 'pencil3d' || activeTool === 'eraser3d') {
      e.stopPropagation();
      const mouse = { x: e.pointer.x, y: e.pointer.y };
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        isDrawing3D.current = true;
        if (activeTool === 'pencil3d') {
          currentPointsRef.current = [surface.point];
        } else {
          eraseAt(surface.point);
        }
      }
    } else if (activeTool === 'measure') {
      e.stopPropagation();
      const mouse = { x: e.pointer.x, y: e.pointer.y };
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        if (!tempMeasurement) {
          // Start a new measurement
          setTempMeasurement({ start: surface.point, end: surface.point.clone() });
        } else {
          // Finish the measurement
          const distance = tempMeasurement.start.distanceTo(surface.point);
          if (distance > 0.01) {
            onAddMeasurement({
              id: Math.random().toString(36).substring(2, 11),
              start: { x: tempMeasurement.start.x, y: tempMeasurement.start.y, z: tempMeasurement.start.z },
              end: { x: surface.point.x, y: surface.point.y, z: surface.point.z },
              distance
            });
          }
          setTempMeasurement(null);
        }
      }
    } else if (activeTool === 'place') {
      e.stopPropagation();
      const mouse = { x: e.pointer.x, y: e.pointer.y };
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        if (selectedObjectType === 'plank' || selectedObjectType === 'rope') {
          setTempPlacement(prev => [...prev, surface.point]);
          if (tempPlacement.length === 1) { // Just placed the second point
            const start = tempPlacement[0];
            const end = surface.point;
            onAddPlacedObject({
              id: Math.random().toString(36).substring(2, 11),
              type: selectedObjectType,
              position: { x: 0, y: 0, z: 0 }, // Not used for plank/rope
              rotation: { x: 0, y: 0, z: 0 }, // Not used for plank/rope
              scale: { x: 1, y: 1, z: 1 }, // Not used for plank/rope
              color: currentColor,
              points: [
                { x: start.x, y: start.y, z: start.z },
                { x: end.x, y: end.y, z: end.z }
              ]
            });
            setTempPlacement([]);
          }
        } else { // Single point placement for other objects
          onAddPlacedObject({
            id: Math.random().toString(36).substring(2, 11),
            type: selectedObjectType,
            position: { x: surface.point.x, y: surface.point.y, z: surface.point.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: currentColor
          });
        }
      }
    } else if (activeTool === 'focus') {
      e.stopPropagation();
      const mouse = { x: e.pointer.x, y: e.pointer.y };
      const surface = getSurfacePointGPU(mouse);
      if (surface && cameraRef.current && controlsRef.current) {
        // Set animation goals
        targetLookAtRef.current = surface.point.clone();
        
        // Move camera to a comfortable viewing position relative to the new target
        const currentPos = cameraRef.current.position.clone();
        const direction = new THREE.Vector3().subVectors(currentPos, surface.point).normalize();
        const distance = Math.max(20, currentPos.distanceTo(surface.point));
        targetPosRef.current = surface.point.clone().add(direction.multiplyScalar(distance));
        
        isAnimatingCamera.current = true;

        // Auto-switch back to view mode
        onToolChange('view');
      }
    } else if (cameraMode === 'thirdperson' && !isPlayerSpawned) {
      e.stopPropagation();
      const mouse = { x: e.pointer.x, y: e.pointer.y };
      const surface = getSurfacePointGPU(mouse);
      if (surface && cameraRef.current) {
        // 1. Set the player position and initial rotation
        lastPlayerPosition.current.copy(surface.point);
        
        // Face away from camera
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward);
        lastPlayerRotation.current.y = Math.atan2(forward.x, forward.z);
        
        // 2. Mark as spawned
        setIsPlayerSpawned(true);
      }
    }
  }, [activeTool, getSurfacePointGPU, eraseAt, tempMeasurement, onAddMeasurement, selectedObjectType, tempPlacement, onAddPlacedObject, currentColor, cameraRef, controlsRef, targetLookAtRef, targetPosRef, isAnimatingCamera, cameraMode, isPlayerSpawned, setIsPlayerSpawned, lastPlayerPosition, lastPlayerRotation]);

  const handleDoubleClick = useCallback((e: any) => {
    if (activeTool !== 'view') return;
    e.stopPropagation();
  }, [activeTool]);

  const handlePointerMove = useCallback((e: any) => {
    const mouse = { x: e.pointer.x, y: e.pointer.y };

    if (activeTool === 'pencil3d' || activeTool === 'eraser3d') {
      const surface = getSurfacePointGPU(mouse);
      
      if (surface) {
        if (brushRef.current) {
          brushRef.current.position.copy(surface.point);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surface.normal);
          brushRef.current.quaternion.copy(quaternion);
          brushRef.current.visible = true;
        }

        if (isDrawing3D.current) {
          if (activeTool === 'pencil3d') {
            const startStr = performance.now();
            const surfaceRay = getSurfacePointRaycast(mouse);
            const endStr = performance.now();
            setRaycastLatency(endStr - startStr);
            if (surfaceRay) {
              const lastPoint = currentPointsRef.current.at(-1);
              if (!lastPoint || surfaceRay.point.distanceTo(lastPoint) > 0.1) {
                currentPointsRef.current.push(surfaceRay.point);
                setActivePointCount(currentPointsRef.current.length);
              }
            }
          } else { // activeTool === 'eraser3d'
            const surfaceRay = getSurfacePointRaycast(mouse);
            if (surfaceRay) {
              eraseAt(surfaceRay.point);
            }
          }
        }
      } else if (brushRef.current) {
        brushRef.current.visible = false;
      }
      setHoverPoint(null);
    } else if (activeTool === 'focus' || activeTool === 'measure') {
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        setHoverPoint(surface.point);
        setHoverNormal(surface.normal);
      } else {
        setHoverPoint(null);
      }
      if (brushRef.current) brushRef.current.visible = false;
    } else if (cameraMode === 'thirdperson' && !isPlayerSpawned) {
      const surface = getSurfacePointGPU(mouse);
      if (surface) {
        setHoverPoint(surface.point);
        setHoverNormal(surface.normal);
      } else {
        setHoverPoint(null);
      }
      if (brushRef.current) brushRef.current.visible = false;
    } else {
      setHoverPoint(null);
      if (brushRef.current) brushRef.current.visible = false;
    }

    if (activeTool === 'measure' && tempMeasurement) {
      const surface = getSurfacePointRaycast(mouse);
      if (surface) {
        setTempMeasurement(prev => prev ? { ...prev, end: surface.point } : null);
      }
    } else if (activeTool === 'place' && tempPlacement.length === 1) {
      // Update the second point of a temporary plank/rope
      const surface = getSurfacePointRaycast(mouse);
      if (surface) {
        setTempPlacement([tempPlacement[0], surface.point]);
      }
    }
  }, [activeTool, getSurfacePointGPU, getSurfacePointRaycast, eraseAt, setActivePointCount, setRaycastLatency, tempMeasurement, tempPlacement]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing3D.current) {
      setActivePointCount(0);
      if (currentPointsRef.current.length > 1 && activeTool === 'pencil3d') {
        // Aggressive simplification: 0.05 tolerance instead of 0.01
        const simplifyTolerance = 0.05;
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
  }, [activeTool, currentColor, pencilWidth, onAddPath3D, setActivePointCount]);

  // We still need a global pointerup to finish the stroke if the mouse leaves the mesh
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

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

    // Required for Dashed material to work correctly on a changing geometry
    liveLineObjRef.current.computeLineDistances();
  });

  return (
    <>
      <group ref={modelGroupRef} scale={1} onPointerLeave={() => setHoverInfo(null)}>
        <MainModel
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onDoubleClick={handleDoubleClick}
          onTargetsUpdate={onTargetsUpdate}
        />
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
        {/* Render Placed Objects */}
        <PlacementRenderer objects={placedObjects} />

        {/* Render Temp Measurement Line */}
        {tempMeasurement && tempMeasurement.end && (
          <Line
            points={[tempMeasurement.start, tempMeasurement.end]}
            color={shaderTheme.measurement.tempLine}
            lineWidth={2}
            dashed
          />
        )}

        {/* Render Temp Placement Line (for plank/rope) */}
        {tempPlacement.length === 2 && (
          <Line
            points={tempPlacement}
            color={currentColor}
            lineWidth={2}
            dashed
          />
        )}
        <MeasurementRenderer 
          measurements={measurements} 
          tempMeasurement={tempMeasurement}
          onRemove={onRemoveMeasurement}
          unitSystem={unitSystem}
        />

        {/* 3D Cursors / Reticles */}
        {hoverPoint && hoverNormal && (activeTool === 'focus' || activeTool === 'measure' || (cameraMode === 'thirdperson' && !isPlayerSpawned)) && (
          <CursorReticle 
            position={hoverPoint} 
            normal={hoverNormal} 
            color={cameraMode === 'thirdperson' ? '#ffeb3b' : (activeTool === 'measure' ? '#00e5ff' : '#ffffff')}
            type={activeTool === 'focus' || cameraMode === 'thirdperson' ? 'focus' : 'measure'} 
          />
        )}
      </group>
    </>
  );
};

const PerformanceUpdater = ({ setFps }: { setFps: (fps: number) => void }) => {
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastFpsUpdateRef.current;
    if (elapsed >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / elapsed));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  });

  return null;
};

interface CameraFocusManagerProps {
  isAnimating: React.RefObject<boolean>;
  targetPos: React.RefObject<THREE.Vector3 | null>;
  targetLookAt: React.RefObject<THREE.Vector3 | null>;
  controlsRef: React.RefObject<any>;
}

const CameraFocusManager = ({ isAnimating, targetPos, targetLookAt, controlsRef }: CameraFocusManagerProps) => {
  useFrame((state, delta) => {
    if (isAnimating.current && targetPos.current && targetLookAt.current && controlsRef.current) {
      const lerpFactor = 5 * delta; // Reduced from 10 for smoother, slower transition
      
      // Smoothly move camera and control target
      state.camera.position.lerp(targetPos.current, lerpFactor);
      controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      
      // Force control update during animation
      controlsRef.current.update();

      // Loosened threshold slightly for faster handoff
      if (state.camera.position.distanceTo(targetPos.current) < 0.2 && 
          controlsRef.current.target.distanceTo(targetLookAt.current) < 0.2) {
        isAnimating.current = false;
        // Final sync for cleanliness
        state.camera.position.copy(targetPos.current);
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
    }
  });
  return null;
};

const CameraDebugUpdater = ({ controlsRef, cameraRef, active }: { controlsRef: React.RefObject<any>; cameraRef: React.RefObject<THREE.Camera>; active: boolean }) => {
  useFrame(() => {
    if (!active) return;
    
    // Update Position
    if (cameraRef.current) {
      const p = cameraRef.current.position;
      (['x', 'y', 'z'] as const).forEach(axis => {
        const el = document.getElementById(`cam-pos-${axis}`);
        if (el) el.innerText = p[axis].toFixed(2);
      });
    }

    // Update Target and Polar Angle from controls
    if (controlsRef.current) {
      const t = controlsRef.current.target;
      (['x', 'y', 'z'] as const).forEach(axis => {
        const el = document.getElementById(`cam-target-${axis}`);
        if (el) el.innerText = t[axis].toFixed(2);
      });

      const pa = controlsRef.current.getPolarAngle();
      const elPa = document.getElementById('cam-polar-angle');
      if (elPa) elPa.innerText = pa.toFixed(3);
    }
  });

  return null;
};

const isMobile = navigator.maxTouchPoints > 1;

// Third Person Controller implementation
const ThirdPersonController = ({ 
  active, 
  isPlayerSpawned,
  lastPosition, 
  lastTarget,
  lastRotation 
}: { 
  active: boolean;
  isPlayerSpawned: boolean;
  lastPosition: React.MutableRefObject<THREE.Vector3>;
  lastTarget: React.MutableRefObject<THREE.Vector3>;
  lastRotation: React.MutableRefObject<THREE.Euler>;
}) => {
  const { camera } = useThree();
  const avatarRef = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const moveSpeed = 0.2; 
  const rotateSpeed = 0.02; 
  const BOUNDARY = 140; 
  
  const cameraOffset = new THREE.Vector3(0, 5, 12); 
  const lookAtOffset = new THREE.Vector3(0, 1, 0); 
  const currentLookAt = useRef(new THREE.Vector3());
  const isInitialFrame = useRef(true);

  // Initialize/Sync position on activation
  useEffect(() => {
    if (active && isPlayerSpawned && avatarRef.current) {
      avatarRef.current.position.copy(lastPosition.current);
      avatarRef.current.rotation.copy(lastRotation.current);
    }
  }, [active, isPlayerSpawned]);

  useEffect(() => {
    if (!active || !isPlayerSpawned) return;

    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active, isPlayerSpawned]);

  useFrame((_state, _delta) => {
    if (!active || !isPlayerSpawned || !avatarRef.current) {
      isInitialFrame.current = true;
      return;
    }
    
    // Ensure camera up vector is clean for third person view
    _state.camera.up.set(0, 1, 0);

    const avatar = avatarRef.current;
    
    // 1. Handle Movement & Rotation
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) avatar.rotation.y += rotateSpeed;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) avatar.rotation.y -= rotateSpeed;

    const moveDirection = new THREE.Vector3(0, 0, 0);
    if (keys.current['KeyW'] || keys.current['ArrowUp']) moveDirection.z -= 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) moveDirection.z += 1;

    if (moveDirection.z !== 0) {
      moveDirection.applyQuaternion(avatar.quaternion);
      const nextPos = avatar.position.clone().add(moveDirection.multiplyScalar(moveSpeed));
      
      if (Math.abs(nextPos.x) <= BOUNDARY && Math.abs(nextPos.z) <= BOUNDARY) {
        avatar.position.copy(nextPos);
      }
    }

    avatar.position.y = 0; 

    // 2. Update Camera Follow
    const idealOffset = cameraOffset.clone().applyQuaternion(avatar.quaternion).add(avatar.position);
    const idealLookAt = lookAtOffset.clone();
    idealLookAt.applyQuaternion(avatar.quaternion);
    idealLookAt.add(avatar.position);

    // Persist position and actual target for other modes
    lastPosition.current.copy(avatar.position);
    lastTarget.current.copy(idealLookAt);
    lastRotation.current.copy(avatar.rotation);

    // Smoothly fly towards the ideal position and look-at target
    const alpha = 1 - Math.exp(-4.0 * _delta); // Frame-rate independent smoothing
    
    if (isInitialFrame.current) {
      currentLookAt.current.copy(lastTarget.current);
      isInitialFrame.current = false;
    }

    camera.position.lerp(idealOffset, alpha);
    currentLookAt.current.lerp(idealLookAt, alpha);
    camera.lookAt(currentLookAt.current);
  });

  return active && isPlayerSpawned ? (
    <group ref={avatarRef}>
      <Man scale={1.5} rotation={[0, Math.PI, 0]} />
    </group>
  ) : null;
};

// Movement Keypad for Third Person
const MovementKeypad = ({ onKeyChange }: { onKeyChange: (key: string, value: boolean) => void }) => {
  const [activeButton, setActiveButton] = React.useState<string | null>(null);

  const handlePointerDown = (key: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveButton(key);
    onKeyChange(key, true);
  };

  const handlePointerUp = (key: string) => {
    setActiveButton(null);
    onKeyChange(key, false);
  };

  const btnClass = (key: string) => `
    w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg pointer-events-auto
    ${activeButton === key ? 'bg-[#968142] scale-95 shadow-inner' : 'bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60'}
    transition-all duration-100 select-none touch-none
  `;

  return (
    <div className="absolute bottom-6 left-6 z-50 flex flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-2 p-4 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5">
        {/* Forward */}
        <button 
          className={btnClass('KeyW')}
          onPointerDown={(e) => handlePointerDown('KeyW', e)}
          onPointerUp={() => handlePointerUp('KeyW')}
          onPointerLeave={() => handlePointerUp('KeyW')}
        >
          <ChevronUp size={32} />
        </button>

        <div className="flex gap-2">
          {/* Left */}
          <button 
            className={btnClass('KeyA')}
            onPointerDown={(e) => handlePointerDown('KeyA', e)}
            onPointerUp={() => handlePointerUp('KeyA')}
            onPointerLeave={() => handlePointerUp('KeyA')}
          >
            <ChevronLeft size={32} />
          </button>

          {/* Back */}
          <button 
            className={btnClass('KeyS')}
            onPointerDown={(e) => handlePointerDown('KeyS', e)}
            onPointerUp={() => handlePointerUp('KeyS')}
            onPointerLeave={() => handlePointerUp('KeyS')}
          >
            <ChevronDown size={32} />
          </button>

          {/* Right */}
          <button 
            className={btnClass('KeyD')}
            onPointerDown={(e) => handlePointerDown('KeyD', e)}
            onPointerUp={() => handlePointerUp('KeyD')}
            onPointerLeave={() => handlePointerUp('KeyD')}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Component to render all saved measurements
const MeasurementRenderer = ({ 
  measurements, 
  tempMeasurement, 
  onRemove,
  unitSystem
}: { 
  measurements: Measurement[], 
  tempMeasurement: { start: THREE.Vector3; end: THREE.Vector3 | null } | null,
  onRemove: (id: string) => void,
  unitSystem: UnitSystem
}) => {
  const formatDist = (m: number) => {
    if (unitSystem === 'imperial') {
      return `${(m * 3.28084).toFixed(2)}ft`;
    }
    return `${m.toFixed(2)}m`;
  };

  return (
    <group>
      {/* Saved Measurements */}
      {measurements.map((m) => (
        <group key={m.id}>
          <Line
            points={[
              [m.start.x, m.start.y, m.start.z],
              [m.end.x, m.end.y, m.end.z]
            ]}
            color="#00e5ff"
            lineWidth={2}
          />
          <Html position={[
            (m.start.x + m.end.x) / 2,
            (m.start.y + m.end.y) / 2,
            (m.start.z + m.end.z) / 2
          ]}>
            <div className="bg-black/80 text-[#00e5ff] px-2 py-1 rounded-md text-[10px] font-bold border border-[#00e5ff]/30 whitespace-nowrap flex items-center gap-2 group">
              {formatDist(m.distance)}
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          </Html>
          {/* Small spheres at endpoints */}
          <Sphere position={[m.start.x, m.start.y, m.start.z]} args={[0.05, 16, 16]}>
            <meshBasicMaterial color="#00e5ff" />
          </Sphere>
          <Sphere position={[m.end.x, m.end.y, m.end.z]} args={[0.05, 16, 16]}>
            <meshBasicMaterial color="#00e5ff" />
          </Sphere>
        </group>
      ))}

      {/* Temporary Measurement (in progress) */}
      {tempMeasurement && tempMeasurement.start && tempMeasurement.end && (
        <group>
          <Line
            points={[
              [tempMeasurement.start.x, tempMeasurement.start.y, tempMeasurement.start.z],
              [tempMeasurement.end.x, tempMeasurement.end.y, tempMeasurement.end.z]
            ]}
            color="#00e5ff"
            lineWidth={1}
            dashed
            dashScale={50}
            dashSize={0.5}
            gapSize={0.5}
          />
          <Html position={[
            (tempMeasurement.start.x + tempMeasurement.end.x) / 2,
            (tempMeasurement.start.y + tempMeasurement.end.y) / 2,
            (tempMeasurement.start.z + tempMeasurement.end.z) / 2
          ]}>
            <div className="bg-black/60 text-[#00e5ff] px-2 py-1 rounded-md text-[10px] opacity-80 border border-[#00e5ff]/20 pointer-events-none">
              {formatDist(tempMeasurement.start.distanceTo(tempMeasurement.end))}
            </div>
          </Html>
          <Sphere position={[tempMeasurement.start.x, tempMeasurement.start.y, tempMeasurement.start.z]} args={[0.04, 16, 16]}>
            <meshBasicMaterial color="#00e5ff" />
          </Sphere>
        </group>
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
  eraserWidth,
  cameraMode,
  onClear,
  showSceneControls,
  setShowSceneControls,
  measurements,
  onAddMeasurement,
  onRemoveMeasurement,
  placedObjects,
  onAddPlacedObject,
  onRemovePlacedObject,
  selectedObjectType,
  unitSystem,
  setUnitSystem,
  onToolChange,
}) => {
  const [fps, setFps] = useState(0);
  const [activePointCount, setActivePointCount] = useState(0);
  const [raycastLatency, setRaycastLatency] = useState(0);

  useEffect(() => {
    ensureBvhRaycastAcceleration();
  }, []);

  const lightRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const [orbitTarget, setOrbitTarget] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [directionalIntensity, setDirectionalIntensity] = useState(3.5);
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [skyRotation, setSkyRotation] = useState<[number, number, number]>([0, 0, 0.0]);
  const [skyScale, setSkyScale] = useState(220);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [fogDistance, setFogDistance] = useState(480);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 13, 150]);
  const [maxOrbitDistance, setMaxOrbitDistance] = useState(200);
  const [maxPolarAngle, setMaxPolarAngle] = useState(1.5);
  const [cameraFov, setCameraFov] = useState(50);
  const [minimapTargets, setMinimapTargets] = useState<Record<string, [number, number, number]>>({});
  
  // Shadow Settings
  const [shadowBias, setShadowBias] = useState(-0.0005);
  const [contactShadowOpacity, setContactShadowOpacity] = useState(0.5);
  const [contactShadowBlur, setContactShadowBlur] = useState(2.5);
  const [contactShadowScale, setContactShadowScale] = useState(255);
  const [contactShadowFar, setContactShadowFar] = useState(10);
  
  // Persistent Player State
  const lastPlayerPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const lastPlayerTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const lastPlayerRotation = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
  
  // Camera animation state
  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const isAnimatingCamera = useRef<boolean>(false);
  const isInternalUpdateRef = useRef<boolean>(false);
  const [isPlayerSpawned, setIsPlayerSpawned] = useState(false);

  const focusOnTarget = useCallback((name: string) => {
    const posArr = minimapTargets[name];
    if (!posArr || !cameraRef.current || !controlsRef.current) return;

    const targetCenter = new THREE.Vector3(...posArr);
    
    // Set animation goals
    targetLookAtRef.current = targetCenter.clone();
    
    // Maintain current camera height (Y) and offset by a fixed distance in Z/X for better visibility
    // But keep the vertical perspective exactly as it is now.
    const currentPos = cameraRef.current.position.clone();
    targetPosRef.current = targetCenter.clone().add(new THREE.Vector3(0, currentPos.y - targetCenter.y, 60));
    
    isAnimatingCamera.current = true;
  }, [minimapTargets]);

  const handleReset = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    targetLookAtRef.current = new THREE.Vector3(-2.28, 0.10, -7.62);
    targetPosRef.current = new THREE.Vector3(1.21, 65.26, 133.47);
    isAnimatingCamera.current = true;
  }, []);

  const { sunPosition, sunColor, sunIntensity } = useMemo(() => {
    // Fixed sun position (14:00 / 2pm)
    const sunPos = new THREE.Vector3(130, 150, 130);
    const color = new THREE.Color(shaderTheme.sun.color);
    const intensity = 1.2;

    return { sunPosition: [sunPos.x, sunPos.y, sunPos.z] as [number, number, number], sunColor: color, sunIntensity: intensity };
  }, []);

  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
  }, [cameraPosition]);



  useEffect(() => {
    if (!cameraRef.current) return;
    if (cameraRef.current instanceof THREE.PerspectiveCamera) {
      cameraRef.current.fov = cameraFov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraFov]);

  useEffect(() => {
    if (cameraMode === 'orbit' && cameraRef.current && lastPlayerTarget.current) {
      if (controlsRef.current) {
        controlsRef.current.target.copy(lastPlayerTarget.current);
        controlsRef.current.update();
      }
    } else if (cameraMode === 'thirdperson') {
      // Reset spawn state when switching to thirdperson mode
      setIsPlayerSpawned(false);
    }
  }, [cameraMode]);



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
      <Minimap targets={minimapTargets} onFocus={focusOnTarget} onReset={handleReset} />

      {cameraMode === 'thirdperson' && isPlayerSpawned && (
        <MovementKeypad 
          onKeyChange={(key, value) => {
            // This allows us to Bridge the keypad to the controller's ref
            // by firing synthetic keyboard events or using a global event bus.
            // For simplicity, we'll dispatch real keyboard events.
            const ev = new KeyboardEvent(value ? 'keydown' : 'keyup', { code: key, bubbles: true });
            window.dispatchEvent(ev);
          }} 
        />
      )}

      {/* HUD Info Removed as requested */}

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
                className="flex-1 accent-[#968142]"
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
                className="flex-1 accent-[#968142]"
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
                className="accent-[#968142]"
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
                  className="flex-1 accent-[#968142]"
                />
                <span className="text-[11px] w-10 text-right">{fogDistance}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Units</div>
            <div className="flex bg-black/20 p-1 rounded-lg gap-1">
              <button
                onClick={() => setUnitSystem('metric')}
                className={`flex-1 py-1 rounded-md text-[10px] uppercase transition-all ${unitSystem === 'metric' ? 'bg-[#968142] text-white shadow-lg' : 'text-[#888] hover:text-white'}`}
              >
                Meters
              </button>
              <button
                onClick={() => setUnitSystem('imperial')}
                className={`flex-1 py-1 rounded-md text-[10px] uppercase transition-all ${unitSystem === 'imperial' ? 'bg-[#968142] text-white shadow-lg' : 'text-[#888] hover:text-white'}`}
              >
                Feet
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Lighting</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Direct</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.05"
                value={directionalIntensity}
                onChange={(e) => setDirectionalIntensity(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-10 text-right">{directionalIntensity.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Ambient</span>
              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={ambientIntensity}
                onChange={(e) => setAmbientIntensity(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-10 text-right">{ambientIntensity.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Shadow Settings</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Dir Bias</span>
              <input
                type="range"
                min="-0.01"
                max="0.01"
                step="0.0001"
                value={shadowBias}
                onChange={(e) => setShadowBias(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-12 text-right">{shadowBias.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">C. Opacity</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={contactShadowOpacity}
                onChange={(e) => setContactShadowOpacity(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-12 text-right">{contactShadowOpacity.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">C. Blur</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={contactShadowBlur}
                onChange={(e) => setContactShadowBlur(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-12 text-right">{contactShadowBlur.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">C. Scale</span>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={contactShadowScale}
                onChange={(e) => setContactShadowScale(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-12 text-right">{contactShadowScale}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">C. Far</span>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.1"
                value={contactShadowFar}
                onChange={(e) => setContactShadowFar(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-12 text-right">{contactShadowFar.toFixed(1)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#3c3c3c] pt-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9d9d9d]">Camera Axis</div>
            <div className="grid grid-cols-3 gap-2">
              {(['X', 'Y', 'Z'] as const).map((axis) => (
                <div
                  key={`pos-${axis}`}
                  className="h-8 flex items-center px-2 text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm text-[#968142] font-mono"
                  title={`Camera ${axis}`}
                >
                  <span className="text-[#9d9d9d] mr-1">{axis}:</span>
                  <span id={`cam-pos-${axis.toLowerCase()}`}>0.0</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-[#9d9d9d]">Target</div>
            <div className="grid grid-cols-3 gap-2">
              {(['X', 'Y', 'Z'] as const).map((axis) => (
                <div
                  key={`target-${axis}`}
                  className="h-8 flex items-center px-2 text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm text-[#968142] font-mono"
                  title={`Target ${axis}`}
                >
                  <span className="text-[#9d9d9d] mr-1">{axis}:</span>
                  <span id={`cam-target-${axis.toLowerCase()}`}>0.0</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Live Polar</span>
              <div className="flex-1 h-8 flex items-center px-2 text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm text-[#968142] font-mono">
                <span id="cam-polar-angle">0.00</span>
                <span className="text-[#9d9d9d] ml-1">rad</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Zoom Limit</span>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={maxOrbitDistance}
                onChange={(e) => setMaxOrbitDistance(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-10 text-right">{maxOrbitDistance}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] w-16 text-[#9d9d9d]">Polar Angle</span>
              <input
                type="range"
                min="0"
                max="3.14"
                step="0.01"
                value={maxPolarAngle}
                onChange={(e) => setMaxPolarAngle(Number.parseFloat(e.target.value))}
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-10 text-right">{maxPolarAngle.toFixed(2)}</span>
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
                className="flex-1 accent-[#968142]"
              />
              <span className="text-[11px] w-10 text-right">{cameraFov}</span>
            </div>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov, near: 0.1, far: 1000 }}
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
          if (cameraRef.current) {
            cameraRef.current.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
            cameraRef.current.lookAt(orbitTarget);
          }
        }}
      >

        <Suspense fallback={null}>
          <EnvironmentManager />
        </Suspense>
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
          shadow-bias={shadowBias}
        />
        {/* eslint-enable react/no-unknown-property */}

        <ContactShadows 
          opacity={contactShadowOpacity} 
          scale={contactShadowScale} 
          blur={contactShadowBlur} 
          far={contactShadowFar} 
          resolution={512} 
          color="#000000"
        />


        <Suspense fallback={null}>
          <PerformanceUpdater setFps={setFps} />
          <CameraFocusManager 
            isAnimating={isAnimatingCamera} 
            targetPos={targetPosRef} 
            targetLookAt={targetLookAtRef} 
            controlsRef={controlsRef} 
          />
          <CameraDebugUpdater
            controlsRef={controlsRef}
            cameraRef={cameraRef as React.RefObject<THREE.Camera>}
            active={showSceneControls}
          />
          <ModelWithAnnotations
            activeTool={activeTool}
            onAddPath3D={onAddPath3D}
            onRemovePath3D={onRemovePath3D}
            currentColor={currentColor}
            pencilWidth={pencilWidth}
            eraserWidth={eraserWidth}
            paths3D={paths3D}
            skyRef={skyRef}
            setActivePointCount={setActivePointCount}
            setRaycastLatency={setRaycastLatency}
            onTargetsUpdate={setMinimapTargets}
            measurements={measurements}
            onAddMeasurement={onAddMeasurement}
            onRemoveMeasurement={onRemoveMeasurement}
            placedObjects={placedObjects}
            onAddPlacedObject={onAddPlacedObject}
            onRemovePlacedObject={onRemovePlacedObject}
            selectedObjectType={selectedObjectType}
            targetPosRef={targetPosRef}
            targetLookAtRef={targetLookAtRef}
            isAnimatingCamera={isAnimatingCamera}
            controlsRef={controlsRef}
            cameraRef={cameraRef}
            unitSystem={unitSystem}
            onToolChange={onToolChange}
            cameraMode={cameraMode}
            isPlayerSpawned={isPlayerSpawned}
            setIsPlayerSpawned={setIsPlayerSpawned}
            lastPlayerPosition={lastPlayerPosition}
            lastPlayerRotation={lastPlayerRotation}
          />
        </Suspense>

        <ThirdPersonController 
          active={cameraMode === 'thirdperson'} 
          isPlayerSpawned={isPlayerSpawned}
          lastPosition={lastPlayerPosition}
          lastTarget={lastPlayerTarget}
          lastRotation={lastPlayerRotation}
        />

        {/* Post-processing effects for better visual quality */}
        <EffectComposer multisampling={4}>
          <Smaa />
        </EffectComposer>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!isDrawingMode && activeTool === 'view' && (cameraMode === 'orbit' || (cameraMode === 'thirdperson' && !isPlayerSpawned))}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={1}
          zoomSpeed={1}
          minDistance={5}
          maxDistance={maxOrbitDistance}
          maxPolarAngle={maxPolarAngle}
          enablePan={true}
          onChange={() => {
            const controls = controlsRef.current;
            if (controls && !isAnimatingCamera.current && cameraRef.current && !isInternalUpdateRef.current && (cameraMode === 'orbit' || (cameraMode === 'thirdperson' && !isPlayerSpawned))) {
              let changed = false;
              
              // 1. Prevent target from going under ground
              if (controls.target && controls.target.y < 0) {
                controls.target.y = 0;
                changed = true;
              }

              // 2. Prevent camera itself from going under ground (min height 1.0)
              const minCamY = 1.0;
              if (cameraRef.current.position.y < minCamY) {
                const diff = minCamY - cameraRef.current.position.y;
                cameraRef.current.position.y = minCamY;
                if (controls.target) {
                  controls.target.y += diff;
                }
                changed = true;
              }

              if (changed) {
                isInternalUpdateRef.current = true;
                controls.update();
                isInternalUpdateRef.current = false;
              }

              // Sync refs for transitions
              if (lastPlayerTarget.current && controls.target) {
                lastPlayerTarget.current.copy(controls.target);
              }
              if (lastPlayerPosition.current) {
                lastPlayerPosition.current.copy(cameraRef.current.position);
              }
              
              if (lastPlayerRotation.current) {
                const forward = new THREE.Vector3();
                cameraRef.current.getWorldDirection(forward);
                lastPlayerRotation.current.y = Math.atan2(forward.x, forward.z);
              }
            }
          }}
        />
      </Canvas>

    </div>
  );
};

export default Viewer3D;
