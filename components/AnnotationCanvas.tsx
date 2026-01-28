
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Path, ToolMode } from '../types';

interface AnnotationCanvasProps {
  isDrawingMode: boolean;
  activeTool: ToolMode;
  currentColor: string;
  pencilWidth: number;
  eraserWidth: number;
  paths: Path[];
  onAddPath: (path: Path) => void;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({ 
  isDrawingMode, 
  activeTool,
  currentColor, 
  pencilWidth,
  eraserWidth,
  paths,
  onAddPath 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const activeWidth = activeTool === 'eraser' ? eraserWidth : pencilWidth;

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent): Point | null => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (coords) {
      setMousePos(coords);
      if (isDrawing && isDrawingMode) {
        if (e.cancelable) e.preventDefault();
        setCurrentPoints((prev) => [...prev, coords]);
      }
    }
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    if (event.cancelable) event.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(event);
    if (coords) {
      setMousePos(coords);
      setCurrentPoints([coords]);
    }
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 1) {
      onAddPath({
        points: currentPoints,
        color: activeTool === 'eraser' ? 'rgba(0,0,0,1)' : currentColor,
        width: activeWidth,
        isEraser: activeTool === 'eraser',
      });
    }
    setCurrentPoints([]);
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPath = (path: Path) => {
      if (path.points.length < 2) return;
      
      ctx.save();
      if (path.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    };

    paths.forEach(drawPath);

    if (currentPoints.length > 1) {
      drawPath({
        points: currentPoints,
        color: activeTool === 'eraser' ? 'rgba(0,0,0,1)' : currentColor,
        width: activeWidth,
        isEraser: activeTool === 'eraser',
      });
    }
  }, [paths, currentPoints, currentColor, activeTool, activeWidth]);

  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        renderCanvas();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [paths, currentPoints, currentColor, renderCanvas]);

  return (
    <div 
      className={`absolute inset-0 z-10 ${isDrawingMode ? 'cursor-none touch-none' : 'pointer-events-none'}`}
      onMouseDown={startDrawing}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrawing}
      onMouseLeave={() => { stopDrawing(); setMousePos(null); }}
      onTouchStart={startDrawing}
      onTouchMove={handleMouseMove}
      onTouchEnd={stopDrawing}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      
      {/* Eraser/Pencil Visual Feedback Cursor */}
      {isDrawingMode && mousePos && (
        <div 
          className={`pointer-events-none absolute rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border ${
            activeTool === 'eraser' ? 'border-white/50' : 'border-white/20'
          }`}
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: activeWidth,
            height: activeWidth,
            transform: 'translate(-50%, -50%)',
            backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.1)' : currentColor,
            mixBlendMode: activeTool === 'eraser' ? 'difference' : 'normal'
          }}
        />
      )}
    </div>
  );
};

export default AnnotationCanvas;