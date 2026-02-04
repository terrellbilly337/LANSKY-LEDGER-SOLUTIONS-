
import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, subMessage, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // 6 seconds display time for achievements
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md animate-fade-in-down">
      <div className="bg-slate-900 border-2 border-amber-400/80 text-amber-50 rounded-xl shadow-2xl overflow-hidden relative">
        {/* Gold Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600"></div>
        
        <div className="p-4 flex items-start gap-4">
          <div className="bg-amber-400/20 p-2 rounded-full border border-amber-400/50 mt-1">
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-black text-amber-400 text-sm tracking-wider uppercase mb-1">
              {message}
            </h4>
            <p className="text-slate-200 text-xs leading-relaxed font-medium">
              {subMessage}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-amber-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
