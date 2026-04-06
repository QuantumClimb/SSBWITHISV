
import React, { useState, useCallback } from 'react';
import Viewer3D from './components/Viewer3D';
import AnnotationCanvas from './components/AnnotationCanvas';
import Toolbar from './components/Toolbar';
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import { useProgress } from '@react-three/drei';
import { Path, Path3D, ToolMode, CameraMode, Measurement, PlacedObject, ObjectType, UnitSystem } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [tool, setTool] = useState<ToolMode>('view');
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [color, setColor] = useState('#ffeb3b');
  const [pencilWidth, setPencilWidth] = useState(4);
  const [eraserWidth, setEraserWidth] = useState(40);
  const [paths, setPaths] = useState<Path[]>([]);
  const [paths3D, setPaths3D] = useState<Path3D[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType>('cylinder');

  const is2DDrawingMode = tool === 'pencil' || tool === 'eraser';
  const is3DDrawingMode = tool === 'pencil3d' || tool === 'eraser3d';

  const selectTool = useCallback((newTool: ToolMode) => {
    setTool(newTool);
  }, []);

  const clearAnnotations = useCallback(() => {
    setPaths([]);
    setPaths3D([]);
    setMeasurements([]);
    setPlacedObjects([]);
  }, []);

  const addPath = useCallback((newPath: Path) => {
    setPaths((prev) => [...prev, newPath]);
  }, []);

  const addPath3D = useCallback((newPath: Path3D) => {
    setPaths3D((prev) => [...prev, newPath]);
  }, []);

  const removePath3D = useCallback((id: string) => {
    setPaths3D((prev) => prev.filter(p => p.id !== id));
  }, []);

  const undoPath3D = useCallback(() => {
    setPaths3D((prev) => prev.slice(0, -1));
  }, []);

  const addMeasurement = useCallback((m: Measurement) => {
    setMeasurements((prev) => [...prev, m]);
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter(m => m.id !== id));
  }, []);

  const addPlacedObject = useCallback((obj: PlacedObject) => {
    setPlacedObjects((prev) => [...prev, obj]);
  }, []);

  const removePlacedObject = useCallback((id: string) => {
    setPlacedObjects((prev) => prev.filter(obj => obj.id !== id));
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative w-screen h-screen bg-[#0a0a0b] select-none overflow-hidden text-white font-sans">
      {!isStarted && (
        <SplashScreen onStart={() => setIsStarted(true)} />
      )}
      
      {/* 3D Model Layer */}
      <Viewer3D
        isDrawingMode={is3DDrawingMode}
        activeTool={tool}
        paths3D={paths3D}
        onAddPath3D={(p) => setPaths3D([...paths3D, p])}
        onRemovePath3D={(id) => setPaths3D(paths3D.filter(p => p.id !== id))}
        currentColor={color}
        pencilWidth={pencilWidth}
        eraserWidth={eraserWidth}
        cameraMode={cameraMode}
        onClear={() => { setPaths3D([]); setMeasurements([]); setPlacedObjects([]); }}
        showSceneControls={showSceneControls}
        setShowSceneControls={setShowSceneControls}
        measurements={measurements}
        onAddMeasurement={(m) => setMeasurements([...measurements, m])}
        onRemoveMeasurement={(id) => setMeasurements(measurements.filter(m => m.id !== id))}
        placedObjects={placedObjects}
        onAddPlacedObject={(o) => setPlacedObjects([...placedObjects, o])}
        onRemovePlacedObject={(id) => setPlacedObjects(placedObjects.filter(o => o.id !== id))}
        selectedObjectType={selectedObjectType}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        onToolChange={selectTool}
      />

      {/* 2D Annotation Overlay Layer */}
      {isStarted && (
        <AnnotationCanvas
          isDrawingMode={is2DDrawingMode}
          activeTool={tool}
          currentColor={color}
          pencilWidth={pencilWidth}
          eraserWidth={eraserWidth}
          paths={paths}
          onAddPath={addPath}
        />
      )}

      {/* UI Controls Overlay */}
      {isStarted && (
        <Toolbar
          tool={tool}
          onSelectTool={selectTool}
          onClear={clearAnnotations}
          color={color}
          onColorChange={setColor}
          pencilWidth={pencilWidth}
          onPencilWidthChange={setPencilWidth}
          eraserWidth={eraserWidth}
          onEraserWidthChange={setEraserWidth}
          cameraMode={cameraMode}
          onCameraModeChange={(mode) => setCameraMode(mode)}
          showSceneControls={showSceneControls}
          onToggleSceneControls={() => setShowSceneControls(!showSceneControls)}
          selectedObjectType={selectedObjectType}
          onSelectedObjectTypeChange={setSelectedObjectType}
        />
      )}

      {/* Branding Overlay */}
      {isStarted && (
        <>
          <div className="absolute top-6 left-6 z-20 pointer-events-none flex items-center">
            <img 
              src="/VTX_LOGO.png" 
              alt="VTX" 
              className="h-8 w-auto object-contain drop-shadow-lg" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div className="absolute top-6 right-6 z-20 pointer-events-none text-right">
            <h1 className="text-white text-[11px] font-bold tracking-[0.3em] font-kelson uppercase drop-shadow-lg">
              VTX - VIRTUAL TRAINING XPERIENCE
            </h1>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
