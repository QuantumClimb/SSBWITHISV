import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react';

export type MovementDirection = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';

interface MovementGamepadProps {
    onDirectionChange: (direction: MovementDirection, active: boolean) => void;
    activeDirections: Set<MovementDirection>;
}

const MovementGamepad: React.FC<MovementGamepadProps> = ({ onDirectionChange, activeDirections }) => {
    const handleInteraction = (direction: MovementDirection, active: boolean) => {
        onDirectionChange(direction, active);
    };

    const Button = ({
        direction,
        icon: Icon,
        label,
        className = ""
    }: {
        direction: MovementDirection;
        icon: any;
        label: string;
        className?: string;
    }) => {
        const isActive = activeDirections.has(direction);

        return (
            <button
                onMouseDown={() => handleInteraction(direction, true)}
                onMouseUp={() => handleInteraction(direction, false)}
                onMouseLeave={() => handleInteraction(direction, false)}
                onTouchStart={(e) => {
                    e.preventDefault();
                    handleInteraction(direction, true);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    handleInteraction(direction, false);
                }}
                className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-150 select-none touch-none
          ${isActive
                        ? 'bg-[#007acc] border-[#007acc] text-white scale-90 shadow-inner'
                        : 'bg-[#252526]/80 border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d30]'} 
          ${className}`}
                title={label}
            >
                <Icon size={20} />
            </button>
        );
    };

    return (
        <div className="absolute bottom-24 left-5 z-40 flex flex-col items-center gap-2 pointer-events-auto">
            {/* Up Button (Isolated) */}
            <div className="mb-2">
                <Button direction="up" icon={ArrowUp} label="Move Up" className="border-cyan-900/50" />
            </div>

            {/* DPAD Grid */}
            <div className="grid grid-cols-3 gap-2">
                <div />
                <Button direction="forward" icon={ArrowUp} label="Forward" />
                <div />

                <Button direction="left" icon={ArrowLeft} label="Left" />
                <Button direction="backward" icon={ArrowDown} label="Backward" />
                <Button direction="right" icon={ArrowRight} label="Right" />

                <div />
                <div />
                <div />
            </div>

            <div className="mt-2">
                <Button direction="down" icon={ArrowDown} label="Move Down" className="border-cyan-900/50" />
            </div>
        </div>
    );
};

export default MovementGamepad;
