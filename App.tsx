
import React, { useState, useCallback } from 'react';
import Viewer3D from './components/Viewer3D';
import AnnotationCanvas from './components/AnnotationCanvas';
import Toolbar from './components/Toolbar';
import Login from './components/Login';
import { Path, Path3D, ToolMode } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlayerMode, setIsPlayerMode] = useState(false);
  const [tool, setTool] = useState<ToolMode>('view');
  const [color, setColor] = useState('#007acc');
  const [pencilWidth, setPencilWidth] = useState(4);
  const [eraserWidth, setEraserWidth] = useState(40);
  const [paths, setPaths] = useState<Path[]>([]);
  const [paths3D, setPaths3D] = useState<Path3D[]>([]);

  const is2DDrawingMode = tool === 'pencil' || tool === 'eraser';
  const is3DDrawingMode = tool === 'pencil3d' || tool === 'eraser3d';

  const selectTool = useCallback((newTool: ToolMode) => {
    setTool(newTool);
  }, []);

  const clearAnnotations = useCallback(() => {
    if (confirm('Clear all 2D and 3D annotations?')) {
      setPaths([]);
      setPaths3D([]);
    }
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

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative w-screen h-screen bg-slate-900 select-none overflow-hidden text-white font-sans">
      {/* 3D Model Layer */}
      <Viewer3D 
        isDrawingMode={is3DDrawingMode} 
        activeTool={tool}
        isPlayerMode={isPlayerMode}
        paths3D={paths3D}
        onAddPath3D={addPath3D}
        onRemovePath3D={removePath3D}
        currentColor={color}
        pencilWidth={pencilWidth}
        eraserWidth={eraserWidth}
      />

      {/* 2D Annotation Overlay Layer */}
      <AnnotationCanvas 
        isDrawingMode={is2DDrawingMode} 
        activeTool={tool}
        currentColor={color} 
        pencilWidth={pencilWidth}
        eraserWidth={eraserWidth}
        paths={paths}
        onAddPath={addPath}
      />

      {/* UI Controls Overlay */}
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
        isPlayerMode={isPlayerMode}
        onTogglePlayerMode={() => setIsPlayerMode(prev => !prev)}
      />

      {/* Overlay for instructions */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <h1 className="text-white text-xl font-bold tracking-tight drop-shadow-lg">
          <span className="text-blue-500">SSBWITHISV</span>
        </h1>
      </div>
    </div>
  );
};

export default App;
