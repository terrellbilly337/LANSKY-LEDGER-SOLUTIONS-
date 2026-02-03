
import React, { useState, useEffect, useRef } from 'react';
import { verifyPin } from '../services/authService';
import { Lock, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, title = "Security Verification" }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      // Small delay to ensure render before focus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyPin(pin);
    if (isValid) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-[var(--primary)]" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center mb-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Enter your security PIN to confirm this deletion.</p>
          </div>
          
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              className={`w-full bg-slate-50 dark:bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-slate-100 text-center text-2xl tracking-[0.5em] rounded-xl py-3 focus:outline-none focus:border-[var(--primary)] transition-colors`}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value);
              }}
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 text-center font-medium animate-pulse">
              Incorrect PIN
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length < 4}
              className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinModal;
