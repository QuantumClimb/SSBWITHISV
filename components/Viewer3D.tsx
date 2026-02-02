
import React, { Suspense, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Line, Sphere, Sky, ContactShadows, Stats } from '@react-three/drei';
import { EffectComposer, SSAO, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Path3D, ToolMode } from '../types';
import * as Models from './models';

// Import all models
const {
  Ground,
  CT: Ct,
  HGT: Hgt,
  CT_AUX: CtAux,
  IND_OBS: IndObs,
  Gate,
  Pathway,
  FGT: Fgt,
  L_OBS: LObs,
  PGT_BASE: PgtBase,
  Trees,
} = Models;


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
  const modelGroupRef = useRef<THREE.Group>(null);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{point: THREE.Vector3, normal: THREE.Vector3} | null>(null);
  const isDrawing3D = useRef(false);
  const OFFSET_DISTANCE = 0.015;

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

      object.castShadow = true;
      object.receiveShadow = true;

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

  useEffect(() => {
    if (modelGroupRef.current) {
      applyToonMaterial(modelGroupRef.current);
    }
  }, [applyToonMaterial]);

  return (
    <group ref={modelGroupRef} onPointerLeave={() => setHoverInfo(null)}>
      {/* All model components */}
      <Ground 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Ct 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Hgt 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <CtAux 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <IndObs 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Gate 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Pathway 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Fgt 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <LObs 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <PgtBase 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      <Trees 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      
      {hoverInfo && (activeTool === 'pencil3d' || activeTool === 'eraser3d') && (
        // eslint-disable-next-line react/no-unknown-property
        <Sphere
          args={[activeTool === 'eraser3d' ? eraserWidth / 400 : pencilWidth / 200, 16, 16]}
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
        dpr={[1.5, 2]}
        style={{ touchAction: 'none' }}
      >
        <Sky sunPosition={sunPosition} turbidity={2} rayleigh={2} mieCoefficient={0.003} mieDirectionalG={0.7} />
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
          {/* eslint-disable-next-line react/no-unknown-property */}
          <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <planeGeometry args={[200, 200]} />
            {/* eslint-disable-next-line react/no-unknown-property */}
            <meshStandardMaterial color="#18941e" />
          </mesh>
          <ContactShadows
            position={[0, -0.19, 0]}
            opacity={0.45}
            scale={200}
            blur={2.5}
            far={30}
            resolution={1024}
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
        </Suspense>

        <Stats />

        <EffectComposer multisampling={8} enableNormalPass>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <SSAO samples={21} radius={0.35} intensity={15} luminanceInfluence={0.5} color={new THREE.Color('black')} />
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
