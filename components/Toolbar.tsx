
import React from 'react';
import { MousePointer2, Pencil, Trash2, Undo2, Eraser, MoveHorizontal, Box } from 'lucide-react';
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
  const isDrawingMode = tool !== 'view';
  const isEraser = tool === 'eraser' || tool === 'eraser3d';
  const currentWidth = isEraser ? eraserWidth : pencilWidth;
  const setWidth = isEraser ? onEraserWidthChange : onPencilWidthChange;

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20 flex flex-row items-center gap-4 pr-safe">
      {isDrawingMode && (
        <div className="bg-black/95 backdrop-blur-2xl px-6 py-4 rounded-3xl flex items-center gap-6 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4 min-w-[200px]">
            <MoveHorizontal size={20} className="text-zinc-500" />
            <input
              type="range"
              min={isEraser ? "10" : "1"}
              max={isEraser ? "120" : "30"}
              value={currentWidth}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full h-3 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[14px] font-mono font-bold text-zinc-300 w-12 text-right">
              {currentWidth}px
            </span>
          </div>
          
          <div className="w-[1px] h-6 bg-white/20" />
          
          <span className="text-[11px] uppercase tracking-[0.2em] text-blue-400 font-black whitespace-nowrap">
            {tool.replace('3d', ' 3D')} ACTIVE
          </span>
        </div>
      )}

      <div className="bg-zinc-900/90 backdrop-blur-xl p-3 rounded-[32px] flex flex-col items-center gap-3 border border-white/10 shadow-2xl overflow-y-auto no-scrollbar max-h-[80vh]">
        <button
          onClick={onToggleDrawMode}
          className={`flex flex-col items-center gap-2 px-4 py-6 rounded-2xl font-bold transition-all active:scale-90 ${
            tool === 'view' 
              ? 'bg-zinc-100 text-black shadow-lg shadow-white/10' 
              : 'text-zinc-400 hover:bg-white/5'
          }`}
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
          >
            <Pencil size={24} />
          </button>
          <button
            onClick={() => onSelectTool('eraser')}
            className={`p-4 rounded-xl transition-all active:scale-90 ${
              tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
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
          >
            <Box size={24} />
            <span className="text-[10px] font-black tracking-tighter">3D</span>
          </button>
          <button
            onClick={() => onSelectTool('eraser3d')}
            className={`p-4 rounded-xl transition-all active:scale-90 flex items-center justify-center ${
              tool === 'eraser3d' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Eraser size={24} />
              <span className="absolute -top-1 -right-1 text-[8px] bg-purple-400 text-black px-1.5 rounded-sm font-black shadow-sm">3D</span>
            </div>
          </button>
        </div>

        <div className="h-[1px] w-10 bg-white/10 my-1 flex-shrink-0" />

        <div className="flex flex-col items-center gap-3 py-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onColorChange(c);
                if (tool === 'view' || isEraser) onSelectTool('pencil');
              }}
              className={`w-10 h-10 rounded-full border-4 transition-all active:scale-125 ${
                color === c && (tool === 'pencil' || tool === 'pencil3d') ? 'border-white scale-110 shadow-xl' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="h-[1px] w-10 bg-white/10 my-1 flex-shrink-0" />

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onUndo}
            className="p-4 text-zinc-400 active:text-white rounded-2xl hover:bg-white/5 transition-all"
          >
            <Undo2 size={24} />
          </button>

          <button
            onClick={onClear}
            className="p-4 text-red-500 active:bg-red-500/20 rounded-2xl hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
