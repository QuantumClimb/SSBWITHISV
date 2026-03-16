import React, { useEffect } from 'react';
import { MousePointer2, Pencil, Trash2, Eraser, Box, User, Camera, Wrench, LayoutGrid, Circle, Ruler, Crosshair } from 'lucide-react';
import { ToolMode, CameraMode, ObjectType } from '../types';

interface ToolbarProps {
  tool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  onClear: () => void;
  color: string;
  onColorChange: (color: string) => void;
  pencilWidth: number;
  onPencilWidthChange: (width: number) => void;
  eraserWidth: number;
  onEraserWidthChange: (width: number) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  showSceneControls: boolean;
  onToggleSceneControls: () => void;
  selectedObjectType: ObjectType;
  onSelectedObjectTypeChange: (type: ObjectType) => void;
}

const COLORS = [
  '#fff59d', // Light Yellow
  '#ffeb3b', // Bright Yellow
  '#fbc02d', // Deep Yellow
  '#ffcc80', // Light Orange
  '#ff9800', // Orange
  '#f57c00', // Deep Orange
];

const PENCIL_PRESETS = [
  { size: 2 },
  { size: 4 },
  { size: 8 },
];

const ERASER_PRESETS = [
  { size: 30 },
  { size: 60 },
  { size: 100 },
];

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onSelectTool,
  onClear,
  color,
  onColorChange,
  pencilWidth,
  onPencilWidthChange,
  eraserWidth,
  onEraserWidthChange,
  cameraMode,
  onCameraModeChange,
  showSceneControls,
  onToggleSceneControls,
  selectedObjectType,
  onSelectedObjectTypeChange,
}) => {
  const is2DMode = tool === 'pencil' || tool === 'eraser';
  const isEraser = tool === 'eraser' || tool === 'eraser3d';
  const currentWidth = isEraser ? eraserWidth : pencilWidth;
  const setWidth = isEraser ? onEraserWidthChange : onPencilWidthChange;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return; // Don't interfere with system shortcuts

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          onSelectTool('pencil');
          break;
        case 'e':
          e.preventDefault();
          onSelectTool('eraser');
          break;
        case 'v':
          e.preventDefault();
          onSelectTool('view');
          break;
        case '1':
          e.preventDefault();
          setWidth(isEraser ? 30 : 2);
          break;
        case '2':
          e.preventDefault();
          setWidth(isEraser ? 60 : 4);
          break;
        case '3':
          e.preventDefault();
          setWidth(isEraser ? 100 : 8);
          break;

        case 'c':
          e.preventDefault();
          onCameraModeChange(cameraMode === 'orbit' ? 'thirdperson' : 'orbit');
          break;
        case 'm':
          e.preventDefault();
          onSelectTool('measure');
          break;
        case 'f':
          e.preventDefault();
          onSelectTool('focus');
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTool, setWidth, isEraser, onCameraModeChange, cameraMode]);

  const iconButtonClass = (active: boolean) =>
    `h-10 w-10 flex items-center justify-center rounded-md border transition-colors ${active
      ? 'bg-[#094771] border-[#007acc] text-[#ffffff]'
      : 'bg-[#2d2d30] border-[#3c3c3c] text-[#c5c5c5] hover:bg-[#37373d]'
    }`;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 bg-[#252526]/95 backdrop-blur-sm border border-[#3c3c3c] rounded-xl p-2 shadow-2xl flex flex-col items-center gap-2 max-h-[88vh] overflow-y-auto">
      <button onClick={() => onSelectTool('view')} className={iconButtonClass(tool === 'view')} title="View (V)">
        <MousePointer2 size={18} />
      </button>
      <button onClick={() => onSelectTool('pencil')} className={iconButtonClass(tool === 'pencil')} title="2D Pencil (P)">
        <Pencil size={18} />
      </button>
      <button onClick={() => onSelectTool('eraser')} className={iconButtonClass(tool === 'eraser')} title="2D Eraser (E)">
        <Eraser size={18} />
      </button>
      <button onClick={() => onSelectTool('pencil3d')} className={iconButtonClass(tool === 'pencil3d')} title="3D Pencil">
        <Box size={18} />
      </button>
      <button onClick={() => onSelectTool('eraser3d')} className={iconButtonClass(tool === 'eraser3d')} title="3D Eraser">
        <div className="relative">
          <Eraser size={18} />
          <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#569cd6]" />
        </div>
      </button>
      <button onClick={() => onSelectTool('measure')} className={iconButtonClass(tool === 'measure')} title="Measure (M)">
        <Ruler size={18} />
      </button>
      <button onClick={() => onSelectTool('place')} className={iconButtonClass(tool === 'place')} title="Place Object">
        <LayoutGrid size={18} />
      </button>
      <button onClick={() => onSelectTool('focus')} className={iconButtonClass(tool === 'focus')} title="Focus (F)">
        <Crosshair size={18} />
      </button>

      <div className="h-px w-8 bg-[#3c3c3c]" />

      <button
        onClick={() => onCameraModeChange(cameraMode === 'orbit' ? 'thirdperson' : 'orbit')}
        className={iconButtonClass(true)}
        title={cameraMode === 'orbit' ? 'Switch to Third Person (C)' : 'Switch to Orbit Mode (C)'}
      >
        {cameraMode === 'orbit' ? <Camera size={18} /> : <User size={18} />}
      </button>

      {tool === 'pencil' && (
        <>
          <div className="h-px w-8 bg-[#3c3c3c]" />
          <div className="grid grid-cols-2 gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`h-4 w-4 rounded-sm border ${color === c ? 'border-[#007acc] ring-1 ring-[#007acc]' : 'border-[#3c3c3c]'
                  }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </>
      )}

      {is2DMode && (
        <>
          <div className="h-px w-8 bg-[#3c3c3c]" />
          <div className="flex flex-col gap-1">
            {(isEraser ? ERASER_PRESETS : PENCIL_PRESETS).map((preset) => (
              <button
                key={preset.size}
                onClick={() => setWidth(preset.size)}
                className={iconButtonClass(currentWidth === preset.size)}
                title={`Size ${preset.size}`}
              >
                <Circle
                  size={Math.max(8, Math.min(16, isEraser ? preset.size / 6 : preset.size * 2))}
                  fill={isEraser ? 'none' : color}
                />
              </button>
            ))}
          </div>
        </>
      )}

      {tool === 'place' && (
        <>
          <div className="h-px w-8 bg-[#3c3c3c]" />
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onSelectedObjectTypeChange('cylinder')}
              className={iconButtonClass(selectedObjectType === 'cylinder')}
              title="Cylinder"
            >
              <div className="w-4 h-6 border-2 border-current rounded-sm" />
            </button>
            <button
              onClick={() => onSelectedObjectTypeChange('plank')}
              className={iconButtonClass(selectedObjectType === 'plank')}
              title="Plank"
            >
              <div className="w-6 h-2 border-2 border-current rounded-sm" />
            </button>
            <button
              onClick={() => onSelectedObjectTypeChange('rope')}
              className={iconButtonClass(selectedObjectType === 'rope')}
              title="Rope"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20c4-4 8-12 12-16M8 20c4-4 8-12 12-16" />
                </svg>
              </div>
            </button>
          </div>
        </>
      )}

      <div className="h-px w-8 bg-[#3c3c3c]" />

      <button
        onClick={onToggleSceneControls}
        className={iconButtonClass(showSceneControls)}
        title="Scene Settings"
      >
        <Wrench size={18} className={showSceneControls ? 'rotate-45' : ''} />
      </button>

      <button onClick={onClear} className={iconButtonClass(false)} title="Clear all">
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default Toolbar;
