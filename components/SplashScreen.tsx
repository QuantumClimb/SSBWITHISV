import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { Play } from 'lucide-react';

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const { progress, active } = useProgress();
  const [isReady, setIsReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [effectiveProgress, setEffectiveProgress] = useState(0);

  useEffect(() => {
    // Smoother progress animation over at least 2.5 seconds
    const duration = 2500; // 2.5 seconds total
    const interval = 20; // 50fps
    const step = 100 / (duration / interval);
    
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        // Only set ready if real assets are also loaded (progress from drie)
      }
      setEffectiveProgress(current);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Scene is ready when both fake and real progress are done
    if (effectiveProgress === 100 && progress === 100 && !active) {
      const timer = setTimeout(() => setIsReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [effectiveProgress, progress, active]);

  const handleStart = () => {
    setIsFadingOut(true);
    // 2.5s transition duration
    setTimeout(onStart, 2500);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0b] transition-opacity duration-[2500ms] ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative flex flex-col items-center gap-12 text-center">
        
        {/* Title Section */}
        <div className="space-y-4">
          <h2 className="text-[#00e5ff] text-xs font-bold tracking-[0.4em] uppercase opacity-60">System Online</h2>
          <h1 className="text-6xl font-black tracking-tighter text-white">
            WELCOME TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#00e5ff]">VTX</span>
          </h1>
        </div>

        {/* Loading / Action Section */}
        <div className="h-24 flex items-center justify-center">
          {!isReady ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-[#00e5ff] transition-all duration-300 ease-out" 
                  style={{ width: `${effectiveProgress}%` }}
                ></div>
              </div>
              <p className="text-[#999] text-[10px] font-medium tracking-widest uppercase animate-pulse">
                INITIALISING {Math.round(effectiveProgress)}%
              </p>
            </div>
          ) : (
            <div className="relative group p-12 animate-in fade-in zoom-in duration-500">
              {/* Solid color background at 50% opacity */}
              <div className="absolute inset-0 bg-black/50 rounded-2xl backdrop-blur-sm -z-10 transition-transform duration-500 group-hover:scale-105 border border-white/5"></div>
              
              <button
                onClick={handleStart}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:scale-110 group-active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                  <Play fill="currentColor" size={32} className="ml-1" />
                </div>
                <span className="text-white text-sm font-bold tracking-[0.2em] uppercase group-hover:text-[#00e5ff] transition-colors">START ENGINE</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer System Info */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-white/20 uppercase tracking-widest">Platform</span>
          <span className="text-[10px] text-white/40 font-mono">QuantumV_0.8.2</span>
        </div>
        <div className="w-px h-6 bg-white/10 self-center"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-white/20 uppercase tracking-widest">Core</span>
          <span className="text-[10px] text-white/40 font-mono">Engine_Init_OK</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
