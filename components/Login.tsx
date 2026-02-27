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
    <div className="fixed inset-0 w-screen h-screen bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-full max-w-sm mx-4 border border-[#3c3c3c] bg-[#252526] shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <div className="h-9 border-b border-[#3c3c3c] bg-[#2d2d30] px-4 flex items-center">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#c5c5c5]">Authentication</span>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-[#d4d4d4]">
              <span className="text-blue-400">SSBWITHISV</span>
            </h1>
            <p className="mt-1 text-sm text-[#9d9d9d]">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#b0b0b0]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 px-3 bg-[#3c3c3c] border border-[#3c3c3c] text-sm text-[#cccccc] placeholder-[#8a8a8a] outline-none focus:border-[#007acc]"
                placeholder="Enter username"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#b0b0b0]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 bg-[#3c3c3c] border border-[#3c3c3c] text-sm text-[#cccccc] placeholder-[#8a8a8a] outline-none focus:border-[#007acc]"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-[#9d9d9d] hover:text-[#d4d4d4]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-[#be1100] bg-[#5a1d1d]/60 px-3 py-2 text-sm text-[#f48771]">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-10 bg-[#0e639c] hover:bg-[#1177bb] text-sm font-medium text-white transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
