
import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Path3D, ToolMode } from '../types';
// Model chunks to load (lazy loaded on demand)
const MODEL_URLS = {
  ground: '/Ground.glb',
  ct: '/CT.glb',
  hgt: '/HGT.glb',
  ctAux: '/CT_AUX.glb',
  indObs: '/IND_OBS.glb',
  gate: '/Gate.glb',
  pathway: '/Pathway.glb',
  fgt: '/FGT.glb',
  lObs: '/L_OBS.glb',
  pgtBase: '/PGT_BASE.glb',
};


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
  const [scenes, setScenes] = useState<THREE.Scene[]>([]);
  const [loadedModels, setLoadedModels] = useState<Set<string>>(new Set(['ground']));
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{point: THREE.Vector3, normal: THREE.Vector3} | null>(null);
  const isDrawing3D = useRef(false);
  const OFFSET_DISTANCE = 0.015;

  // Load all models sequentially
  useEffect(() => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    const loadAllModels = async () => {
      const modelKeys = Object.keys(MODEL_URLS) as (keyof typeof MODEL_URLS)[];
      
      for (const key of modelKeys) {
        const url = MODEL_URLS[key];
        try {
          await new Promise<void>((resolve, reject) => {
            loader.load(
              url,
              (gltf) => {
                setScenes(prev => [...prev, gltf.scene.clone()]);
                setLoadedModels(prev => new Set([...prev, key]));
                console.log(`Loaded model: ${key}`);
                resolve();
              },
              undefined,
              (error) => {
                console.error(`Error loading ${key} model:`, error);
                reject(error);
              }
            );
          });
        } catch (error) {
          console.error(`Failed to load ${key}:`, error);
        }
      }
    };
    
    loadAllModels();
  }, []);

  const getSurfacePoint = useCallback((e: any) => {
    if (!e.point || !e.face) return null;
    const point = e.point.clone();
    const normal = e.face.normal.clone();
    normal.applyQuaternion(e.object.quaternion);
    point.add(normal.multiplyScalar(OFFSET_DISTANCE));
    return { point, normal };
  }, []);

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
      const clickPoint = e.point;
      paths3D.forEach(path => {
        const isNear = path.points.some(p => {
          const v = new THREE.Vector3(p.x, p.y, p.z);
          return v.distanceTo(clickPoint) < (eraserWidth / 40); 
        });
        if (isNear) onRemovePath3D(path.id);
      });
    }
  }, [activeTool, paths3D, eraserWidth, onRemovePath3D, getSurfacePoint]);

  const handlePointerMove = useCallback((e: any) => {
    const surface = getSurfacePoint(e);
    if (surface) {
      setHoverInfo(surface);
    }
    
    if (isDrawing3D.current && surface) {
      e.stopPropagation();
      if (activeTool === 'pencil3d') {
        const lastPoint = currentPoints.at(-1);
        if (!lastPoint || surface.point.distanceTo(lastPoint) > 0.02) {
          setCurrentPoints(prev => [...prev, surface.point]);
        }
      } else if (activeTool === 'eraser3d') {
        const movePoint = e.point;
        paths3D.forEach(path => {
          const isNear = path.points.some(p => {
            const v = new THREE.Vector3(p.x, p.y, p.z);
            return v.distanceTo(movePoint) < (eraserWidth / 40);
          });
          if (isNear) onRemovePath3D(path.id);
        });
      }
    }
  }, [activeTool, currentPoints, paths3D, eraserWidth, onRemovePath3D, getSurfacePoint]);

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

  return (
    <group onPointerLeave={() => setHoverInfo(null)}>
      {/* Render loaded model chunks at the origin with scale */}
      {scenes.map((scene) => (
        <primitive 
          key={scene.uuid}
          object={scene}
          position={[0, 0, 0]}
          scale={[1, 1, 1]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />
      ))}
      
      {hoverInfo && (activeTool === 'pencil3d' || activeTool === 'eraser3d') && (
        <Sphere args={[activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200, 16, 16]} position={hoverInfo.point}>
          <meshBasicMaterial 
            color={activeTool === 'eraser3d' ? '#ff4444' : currentColor} 
            transparent 
            opacity={0.7} 
            depthTest={false}
          />
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

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.shadow.mapSize.width = 2048;
      lightRef.current.shadow.mapSize.height = 2048;
      lightRef.current.shadow.camera.far = 300;
      lightRef.current.shadow.camera.left = -100;
      lightRef.current.shadow.camera.right = 100;
      lightRef.current.shadow.camera.top = 100;
      lightRef.current.shadow.camera.bottom = -100;
      lightRef.current.shadow.bias = -0.0001;
      lightRef.current.shadow.camera.updateProjectionMatrix();
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900">
      <Canvas 
        shadows 
        camera={{ position: [50, 50, 50], fov: 60, near: 0.1, far: 10000 }} 
        dpr={[1, 2]}
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight 
          ref={lightRef}
          position={[60, 80, 40]} 
          intensity={2.5}
          castShadow
        />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#3b82f6" intensity={1.5} />
        
        <Suspense fallback={<Loader />}>
          <ModelWithAnnotations 
              activeTool={activeTool} 
              onAddPath3D={onAddPath3D}
              onRemovePath3D={onRemovePath3D}
              currentColor={currentColor}
              pencilWidth={pencilWidth}
              eraserWidth={eraserWidth}
              paths3D={paths3D}
            />
            {paths3D.map((path) => (
              <Line
                key={path.id}
                points={path.points.map(p => new THREE.Vector3(p.x, p.y, p.z))}
                color={path.color}
                lineWidth={path.width}
                polygonOffset
                polygonOffsetFactor={-15}
              />
            ))}
          <Environment preset="sunset" />
          <ContactShadows 
            opacity={0.4} 
            scale={100} 
            blur={2.5} 
            far={50} 
            resolution={512} 
            color="#000000" 
          />
        </Suspense>

        <OrbitControls 
          enabled={activeTool === 'view'} 
          makeDefault 
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.8}
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
