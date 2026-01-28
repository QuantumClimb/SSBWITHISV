
import React, { useState, useCallback } from 'react';
import Viewer3D from './components/Viewer3D';
import AnnotationCanvas from './components/AnnotationCanvas';
import Toolbar from './components/Toolbar';
import { Path, Path3D, ToolMode } from './types';

const App: React.FC = () => {
  const [tool, setTool] = useState<ToolMode>('view');
  const [color, setColor] = useState('#ef4444');
  const [pencilWidth, setPencilWidth] = useState(4);
  const [eraserWidth, setEraserWidth] = useState(40);
  const [paths, setPaths] = useState<Path[]>([]);
  const [paths3D, setPaths3D] = useState<Path3D[]>([]);

  const is2DDrawingMode = tool === 'pencil' || tool === 'eraser';
  const is3DDrawingMode = tool === 'pencil3d' || tool === 'eraser3d';

  const toggleDrawMode = useCallback(() => {
    setTool((prev) => (prev === 'view' ? 'pencil' : 'view'));
  }, []);

  const selectTool = useCallback((newTool: ToolMode) => {
    setTool(newTool);
  }, []);

  const clearAnnotations = useCallback(() => {
    if (confirm('Clear all 2D and 3D annotations?')) {
      setPaths([]);
      setPaths3D([]);
    }
  }, []);

  const undoLastPath = useCallback(() => {
    if (tool === 'pencil3d' || tool === 'eraser3d') {
      setPaths3D((prev) => prev.slice(0, -1));
    } else {
      setPaths((prev) => prev.slice(0, -1));
    }
  }, [tool]);

  const addPath = useCallback((newPath: Path) => {
    setPaths((prev) => [...prev, newPath]);
  }, []);

  const addPath3D = useCallback((newPath: Path3D) => {
    setPaths3D((prev) => [...prev, newPath]);
  }, []);

  const removePath3D = useCallback((id: string) => {
    setPaths3D((prev) => prev.filter(p => p.id !== id));
  }, []);

  return (
    <div className="relative w-screen h-screen bg-slate-900 select-none overflow-hidden text-white font-sans">
      {/* 3D Model Layer */}
      <Viewer3D 
        isDrawingMode={is3DDrawingMode} 
        activeTool={tool}
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
        onToggleDrawMode={toggleDrawMode}
        onSelectTool={selectTool}
        onClear={clearAnnotations}
        onUndo={undoLastPath}
        color={color}
        onColorChange={setColor}
        pencilWidth={pencilWidth}
        onPencilWidthChange={setPencilWidth}
        eraserWidth={eraserWidth}
        onEraserWidthChange={setEraserWidth}
      />

      {/* Overlay for instructions */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <h1 className="text-white text-xl font-bold tracking-tight drop-shadow-lg">
          3D Training <span className="text-blue-500">Annotator</span>
        </h1>
        <p className="text-zinc-400 text-sm drop-shadow-md">
          {tool === 'pencil' && '2D Drawing: Annotating screen space.'}
          {tool === 'pencil3d' && '3D Drawing: Click and drag on model.'}
          {tool === 'eraser' && '2D Eraser: Remove screen annotations.'}
          {tool === 'eraser3d' && '3D Eraser: Click 3D lines to remove them.'}
          {tool === 'view' && 'Inspection Mode: Rotate, Zoom, and Pan.'}
        </p>
      </div>
    </div>
  );
};

export default App;
