
import React, { useState, useEffect } from 'react';
import { MousePointer2, Pencil, Trash2, Undo2, Eraser, MoveHorizontal, Box, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { ToolMode } from '../types';

interface ToolbarProps {
  tool: ToolMode;
  onToggleDrawMode: () => void;
  onSelectTool: (tool: ToolMode) => void;
  onClear: () => void;
  onUndo: () => void;
  color: string;
  onColorChange: (color: string) => void;
  pencilWidth: number;
  onPencilWidthChange: (width: number) => void;
  eraserWidth: number;
  onEraserWidthChange: (width: number) => void;
}

const COLORS = [
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#eab308',
  '#a855f7',
  '#ffffff',
];

const PENCIL_PRESETS = [
  { label: 'S', size: 2 },
  { label: 'M', size: 4 },
  { label: 'L', size: 8 },
];

const ERASER_PRESETS = [
  { label: 'S', size: 30 },
  { label: 'M', size: 60 },
  { label: 'L', size: 100 },
];

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToggleDrawMode,
  onSelectTool,
  onClear,
  onUndo,
  color,
  onColorChange,
  pencilWidth,
  onPencilWidthChange,
  eraserWidth,
  onEraserWidthChange,
}) => {
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [showPresets, setShowPresets] = useState(false);

  const isDrawingMode = tool !== 'view';
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
        case 'z':
          if (e.ctrlKey || e.metaKey) onUndo();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) onClear();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTool, setWidth, isEraser, onUndo, onClear]);

  return (
    <>
      {/* Main Toolbar - Right Side */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20 flex flex-row items-center gap-4 pr-safe">
        {/* Settings Panel - Left Sidebar */}
        <div className={`bg-black/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ${
          panelExpanded ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          <div className="p-6 flex flex-col gap-6">
            
            {/* Tool Status Header */}
            <div className="text-center pb-4 border-b border-white/10">
              <div className="inline-block px-3 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/50">
                <p className="text-xs uppercase tracking-widest font-bold text-blue-300">
                  {tool.replace('3d', ' 3D')} Mode
                </p>
              </div>
              {is2DMode && (
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  {currentWidth}px • {color === '#ffffff' ? 'White' : 'Colored'}
                </p>
              )}
            </div>

            {/* Tool Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-1">Tool</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onSelectTool('pencil')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-semibold ${
                    tool === 'pencil' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <Pencil size={18} />
                  <span className="text-sm">Pencil</span>
                  <span className="text-xs text-white/50 ml-auto">P</span>
                </button>
                <button
                  onClick={() => onSelectTool('eraser')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-semibold ${
                    tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <Eraser size={18} />
                  <span className="text-sm">Eraser</span>
                  <span className="text-xs text-white/50 ml-auto">E</span>
                </button>
              </div>
            </div>

            {/* Color Palette */}
            {tool === 'pencil' && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-1">Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onColorChange(c)}
                      className={`w-full aspect-square rounded-xl border-2 transition-all active:scale-95 ${
                        color === c ? 'border-white shadow-lg scale-110' : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c === '#ffffff' ? 'White' : c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stroke Width Control */}
            {is2DMode && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-1">
                  {isEraser ? 'Eraser' : 'Pencil'} Width
                </label>
                
                {/* Slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={isEraser ? "10" : "1"}
                    max={isEraser ? "120" : "30"}
                    value={currentWidth}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs font-mono font-bold text-blue-300 w-10 text-right">
                    {currentWidth}
                  </span>
                </div>

                {/* Stroke Preview */}
                <div className="flex items-center justify-center py-4 bg-white/5 rounded-xl border border-white/10">
                  <Circle
                    size={Math.min(currentWidth, 60)}
                    color={isEraser ? '#6b7280' : color}
                    fill={isEraser ? 'transparent' : color}
                    strokeWidth={2}
                    className="transition-all"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                  {(isEraser ? ERASER_PRESETS : PENCIL_PRESETS).map((preset) => (
                    <button
                      key={preset.size}
                      onClick={() => setWidth(preset.size)}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                        currentWidth === preset.size
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <button
                onClick={onUndo}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-sm font-semibold"
                title="Undo last stroke (Ctrl+Z)"
              >
                <Undo2 size={18} />
                <span>Undo</span>
                <span className="text-xs text-white/50 ml-auto">Ctrl+Z</span>
              </button>
              <button
                onClick={onClear}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-semibold"
                title="Clear all annotations (Ctrl+C)"
              >
                <Trash2 size={18} />
                <span>Clear</span>
                <span className="text-xs text-white/50 ml-auto">Ctrl+C</span>
              </button>
            </div>

            {/* Keyboard Hints */}
            <div className="text-[10px] text-zinc-500 bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="font-mono font-bold mb-1.5">Keyboard Shortcuts</p>
              <div className="space-y-1 text-white/70">
                <p><span className="font-bold">P</span> - Pencil</p>
                <p><span className="font-bold">E</span> - Eraser</p>
                <p><span className="font-bold">1/2/3</span> - Size</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Button - View Mode Tools */}
        <div className="bg-zinc-900/90 backdrop-blur-xl p-3 rounded-[32px] flex flex-col items-center gap-3 border border-white/10 shadow-2xl overflow-y-auto no-scrollbar max-h-[80vh]">
          <button
            onClick={onToggleDrawMode}
            className={`flex flex-col items-center gap-2 px-4 py-6 rounded-2xl font-bold transition-all active:scale-90 ${
              tool === 'view' 
                ? 'bg-zinc-100 text-black shadow-lg shadow-white/10' 
                : 'text-zinc-400 hover:bg-white/5'
            }`}
            title="Toggle drawing mode (V)"
          >
            <MousePointer2 size={24} />
            <span className="text-xs">View</span>
          </button>

          <div className="h-[1px] w-10 bg-white/10 my-1 flex-shrink-0" />

          <div className="flex flex-col items-center gap-2 bg-white/5 p-1.5 rounded-[22px]">
            <button
              onClick={() => onSelectTool('pencil')}
              className={`p-4 rounded-xl transition-all active:scale-90 ${
                tool === 'pencil' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
              title="Pencil tool (P)"
            >
              <Pencil size={24} />
            </button>
            <button
              onClick={() => onSelectTool('eraser')}
              className={`p-4 rounded-xl transition-all active:scale-90 ${
                tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
              title="Eraser tool (E)"
            >
              <Eraser size={24} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 bg-white/5 p-1.5 rounded-[22px]">
            <button
              onClick={() => onSelectTool('pencil3d')}
              className={`p-4 rounded-xl transition-all active:scale-90 flex flex-col items-center gap-1 ${
                tool === 'pencil3d' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
              title="3D Pencil tool"
            >
              <Box size={24} />
              <span className="text-[10px] font-black tracking-tighter">3D</span>
            </button>
            <button
              onClick={() => onSelectTool('eraser3d')}
              className={`p-4 rounded-xl transition-all active:scale-90 flex items-center justify-center ${
                tool === 'eraser3d' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
              title="3D Eraser tool"
            >
              <div className="relative">
                <Eraser size={24} />
                <span className="absolute -top-1 -right-1 text-[8px] bg-purple-400 text-black px-1.5 rounded-sm font-black shadow-sm">3D</span>
              </div>
            </button>
          </div>

          <div className="h-[1px] w-10 bg-white/10 my-1 flex-shrink-0" />

          {/* Expand/Collapse Settings Button */}
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            className="p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all group"
            title={panelExpanded ? 'Hide settings' : 'Show settings'}
          >
            {panelExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          <div className="h-[1px] w-10 bg-white/10 my-1 flex-shrink-0" />

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onUndo}
              className="p-4 text-zinc-400 active:text-white rounded-2xl hover:bg-white/5 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={24} />
            </button>

            <button
              onClick={onClear}
              className="p-4 text-red-500 active:bg-red-500/20 rounded-2xl hover:bg-red-500/10 transition-all"
              title="Clear all (Ctrl+C)"
            >
              <Trash2 size={24} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toolbar;
