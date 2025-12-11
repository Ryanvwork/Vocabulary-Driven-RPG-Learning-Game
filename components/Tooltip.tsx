import React, { useState } from 'react';
import { VocabularyWord } from '../types';

interface TooltipProps {
  word: string;
  vocabData?: VocabularyWord;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ word, vocabData, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    // 500ms delay to prevent accidental popups
    const t = setTimeout(() => {
        setIsVisible(true);
    }, 500);
    setTimer(t);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  return (
    <span 
      className="relative inline-block text-spectral font-bold cursor-help border-b border-spectral border-dotted hover:bg-spectral/10 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && vocabData && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 border border-spectral text-slate-200 text-sm p-3 rounded shadow-[0_0_15px_rgba(0,255,234,0.2)] z-50 pointer-events-none">
          <p className="font-bold text-spectral mb-1">{vocabData.word}</p>
          <p className="italic mb-2 text-xs text-slate-400">{vocabData.definition}</p>
          <p className="text-xs border-t border-slate-700 pt-1">"{vocabData.example}"</p>
        </div>
      )}
    </span>
  );
};
