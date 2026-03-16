
import React, { useState } from 'react';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';

interface MinimapProps {
  targets: Record<string, [number, number, number]>;
  onFocus: (targetName: string) => void;
}

const Minimap: React.FC<MinimapProps> = ({ targets, onFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const zoneNames = Object.keys(targets);
  
  if (zoneNames.length === 0) return null;

  const Button = ({ name, className = "" }: { name: string; className?: string }) => (
    <button
      onClick={() => onFocus(name)}
      className={`
        px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider
        bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc]
        hover:bg-[#2d2d30] hover:text-white hover:border-[#007acc]
        active:bg-[#007acc] transition-all duration-150
        flex items-center justify-center text-center shadow-lg
        ${className}
      `}
    >
      {name}
    </button>
  );

  return (
    <div className="absolute bottom-4 right-6 z-50 flex flex-col-reverse items-end gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-9 px-4 rounded-md flex items-center gap-2 border transition-all duration-200
          ${isOpen 
            ? 'bg-[#007acc] border-[#007acc] text-white shadow-[0_0_15px_rgba(0,122,204,0.4)]' 
            : 'bg-[#252526]/95 border-[#3c3c3c] text-[#c5c5c5] hover:bg-[#2d2d30] hover:text-white'
          }
        `}
        title="Quick Navigation"
      >
        <Map size={16} />
        <span className="text-[11px] font-bold uppercase tracking-widest">Map</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="bg-[#252526]/95 backdrop-blur-md border border-[#3c3c3c] p-3 rounded-md shadow-2xl flex flex-col gap-2 w-80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d] mb-1 px-1">Quick Navigation</div>
          
          {/* Row 1: GROUP OBSTACLES */}
          <div className="grid grid-cols-1">
            <Button name="GROUP OBSTACLES" />
          </div>

          {/* Row 2: HGT, INDIVIDUAL OBSTACLES, FG */}
          <div className="grid grid-cols-3 gap-2">
            <Button name="HGT" />
            <Button name="INDIVIDUAL OBSTACLES" />
            <Button name="FG" />
          </div>

          {/* Row 3: PGT, CT */}
          <div className="grid grid-cols-2 gap-2">
            <Button name="PGT" />
            <Button name="CT" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Minimap;
