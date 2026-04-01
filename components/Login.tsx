import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const VALID_USERNAME = 'Commander';
  const VALID_PASSWORD = 'gtotrainer1';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      setError('');
      onLoginSuccess();
    } else {
      setError('Invalid username or password');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-sm mx-4 space-y-8">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
          <img src="/ISV.png" alt="ISV Logo" className="h-[100px] w-auto object-contain" />
          <div className="space-y-4 font-kelson">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-xl font-ops tracking-[0.05em] text-white uppercase whitespace-nowrap">
                WELCOME TO
              </h1>
              <img src="/VTX_LOGO.png" alt="VTX" className="h-8 w-auto object-contain" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-tactical-gold text-[10px] font-bold tracking-[0.3em] uppercase">
                Built to Prepare, Not Coach <sup className="font-ops text-[0.4em] ml-[-0.1em] align-top">TM</sup>
              </p>
              <p className="text-[#444] text-[8px] font-bold tracking-[0.4em] uppercase">Authentication Required</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#111] border border-white/5 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#666]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-[#968142] focus:bg-white/10 outline-none transition-all placeholder:text-white/20"
                placeholder="Enter commander ID"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#666]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-4 pr-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-[#968142] focus:bg-white/10 outline-none transition-all placeholder:text-white/20"
                  placeholder="Enter security key"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-[#666] hover:text-[#968142] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-tactical-gold text-black rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-tactical-brass hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(150,129,66,0.2)]"
            >
              Authorise
            </button>
          </form>
        </div>
      </div>

      {/* Footer Branding (Matching Splash) */}
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

export default Login;
