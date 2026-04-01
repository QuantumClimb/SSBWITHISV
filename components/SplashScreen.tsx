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
    // Smoother progress animation over 1 second
    const duration = 1000; // 1 second total
    const interval = 20; // 50fps
    const step = 100 / (duration / interval);
    
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
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
    // 1.5s transition duration
    setTimeout(onStart, 1500);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black font-kelson transition-opacity duration-[1500ms] ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="relative flex flex-col items-center gap-12 text-center w-full max-w-2xl px-6">
        
        {/* Branding Section */}
        <div className="flex flex-col items-center gap-8">
          {/* Logo Section */}
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
            <img src="/ISV.png" alt="ISV Logo" className="h-[120px] w-auto object-contain" />
          </div>

          {/* Title and Tagline Section */}
          <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="flex items-center gap-6">
              <h1 className="text-5xl font-ops tracking-[0.1em] text-white uppercase whitespace-nowrap">
                WELCOME TO
              </h1>
              <img src="/VTX_LOGO.png" alt="VTX" className="h-[72px] w-auto object-contain" />
            </div>
            
            <h2 className="text-tactical-gold text-lg font-bold tracking-[0.4em] uppercase">
              Built to Prepare, Not Coach <sup className="font-ops text-[0.4em] ml-[-0.2em] align-top">TM</sup>
            </h2>
          </div>
        </div>

        {/* Loading / Action Section */}
        <div className="h-32 flex items-center justify-center">
          {!isReady ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-80 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-tactical-gold to-tactical-brass transition-all duration-300 ease-out shadow-[0_0_15px_rgba(150,129,66,0.5)]" 
                  style={{ width: `${effectiveProgress}%` }}
                ></div>
              </div>
              <p className="text-tactical-bronze text-[11px] font-bold tracking-[0.4em] uppercase animate-pulse">
                INITIALISING {Math.round(effectiveProgress)}%
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-700">
              <button
                onClick={handleStart}
                className="flex flex-col items-center transition-transform duration-300 hover:scale-110 active:scale-95"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-tactical-gold text-black shadow-[0_0_50px_rgba(150,129,66,0.3)] hover:bg-tactical-brass transition-colors">
                  <Play fill="currentColor" size={32} className="ml-1" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer System Info */}
      <div className="absolute bottom-12 px-12 w-full flex justify-between items-end opacity-30 select-none">
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] text-white font-medium tracking-widest uppercase">
            ©️SSBWITHISV, CS Joint Services Academy Pvt Ltd,
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[10px] text-white font-medium tracking-widest uppercase">
            All rights reserved, 2026.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
