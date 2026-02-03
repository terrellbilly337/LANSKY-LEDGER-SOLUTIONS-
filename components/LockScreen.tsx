
import React, { useState } from 'react';
import { verifyPin } from '../services/authService';
import { Lock, ChevronRight } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
  logo?: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, logo }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const imgSrc = logo || 'logo.svg';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    // Artificial delay for security/UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isValid = await verifyPin(pin);
    if (isValid) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-white border-4 border-slate-100 dark:border-slate-800 mb-2 shadow-2xl overflow-hidden p-4">
             <img src={imgSrc} alt="Lansky Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">LANSKY LEDGER</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm uppercase tracking-widest font-bold mt-1">Solutions</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase text-center">Enter Security PIN</label>
              <div className="relative">
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={6}
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-slate-100 text-center text-2xl tracking-[0.5em] rounded-lg py-4 focus:outline-none focus:border-[var(--primary)] transition-colors`}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    setError(false);
                    setPin(e.target.value);
                  }}
                  autoFocus
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-600" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Unlock Ledger'}
              {!loading && <ChevronRight className="h-4 w-4" />}
            </button>
            
            {error && (
               <p className="text-rose-500 dark:text-rose-400 text-xs text-center animate-pulse">
                 Access Denied: Invalid PIN
               </p>
            )}
          </form>
        </div>
        
        <p className="text-center text-slate-500 dark:text-slate-600 text-xs mt-8">
          Local Encryption Active. Offline Mode.
        </p>
      </div>
    </div>
  );
};

export default LockScreen;
