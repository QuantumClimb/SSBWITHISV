
import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Center, Html, Line, Sphere, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { Path3D, ToolMode } from '../types';
// Model chunks to load
const MODEL_URLS = [
  '/Ground.glb',
  '/CT.glb',
  '/HGT.glb',
  '/CT_AUX.glb',
  '/IND_OBS.glb',
  '/Gate.glb',
  '/Pathway.glb',
  '/FGT.glb',
  '/L_OBS.glb',
  '/PGT_BASE.glb',
];
// Configure GLTF loader with Draco support
if (typeof window !== 'undefined') {
  const url = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
  useGLTF.setDecoderPath?.(url);
}

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

const MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb';

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
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{point: THREE.Vector3, normal: THREE.Vector3} | null>(null);
  const isDrawing3D = useRef(false);
  const OFFSET_DISTANCE = 0.015;

  // Load all model chunks
  useEffect(() => {
    const loadModels = async () => {
      try {
        const loadedScenes = await Promise.all(
          MODEL_URLS.map(url => useGLTF(url).then(gltf => gltf.scene.clone()))
        );
        setScenes(loadedScenes);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };
    loadModels();
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
        const lastPoint = currentPoints[currentPoints.length - 1];
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
            id: Math.random().toString(36).substr(2, 9),
            points: currentPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
            color: currentColor,
            width: pencilWidth
          });
        }
        isDrawing3D.current = false;
        setCurrentPoints([]);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [currentPoints, activeTool, currentColor, pencilWidth, onAddPath3D]);

  return (
    <group onPointerLeave={() => setHoverInfo(null)}>
      {/* Render all model chunks at the same origin point */}
      {scenes.map((scene, index) => (
        <primitive 
          key={index}
          object={scene}
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
  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900">
      <Canvas 
        shadows 
        camera={{ position: [5, 5, 5], fov: 45 }} 
        dpr={[1, 2]}
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={1.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#3b82f6" intensity={1.5} />
        
        <Suspense fallback={<Loader />}>
          <Center top>
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
          </Center>
          <Environment preset="city" />
          <ContactShadows 
            opacity={0.4} 
            scale={10} 
            blur={2.5} 
            far={1.5} 
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
        />
      </Canvas>
    </div>
  );
};

export default Viewer3D;
