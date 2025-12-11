import React from 'react';
import { GameSettings, CEFRLevel, FontFamily } from '../types';

interface SettingsModalProps {
  settings: GameSettings;
  updateSettings: (s: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, updateSettings, onClose }) => {
  
  const handleColorChange = (key: 'background' | 'text', value: string) => {
    updateSettings({
        ...settings,
        customColors: {
            ...settings.customColors,
            [key]: value
        }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 rounded shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-horror text-blood mb-6 tracking-widest text-center">SYSTEM CONFIG</h2>
        
        <div className="space-y-6">
          {/* Difficulty Level */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Reading Difficulty (CEFR)</label>
            <div className="grid grid-cols-6 gap-1">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => updateSettings({ ...settings, difficulty: level })}
                  className={`py-2 border text-xs font-bold ${
                    settings.difficulty === level
                      ? 'border-spectral text-black bg-spectral'
                      : 'border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Adjusts vocabulary complexity and sentence structure.</p>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Font Style</label>
            <div className="flex gap-2">
              {(['mono', 'sans', 'serif', 'horror'] as FontFamily[]).map((font) => (
                <button
                  key={font}
                  onClick={() => updateSettings({ ...settings, fontFamily: font })}
                  className={`flex-1 py-2 px-2 border capitalize text-xs ${
                    settings.fontFamily === font
                      ? 'border-spectral text-spectral bg-spectral/10'
                      : 'border-slate-700 text-slate-500'
                  }`}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Text Scale */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Text Scale</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateSettings({ ...settings, fontSize: size })}
                  className={`flex-1 py-2 px-3 border ${
                    settings.fontSize === size 
                      ? 'border-spectral text-spectral bg-spectral/10' 
                      : 'border-slate-700 text-slate-500'
                  } uppercase text-xs tracking-wider`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm text-slate-400 mb-2">Background Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={settings.customColors.background}
                        onChange={(e) => handleColorChange('background', e.target.value)}
                        className="w-full h-10 bg-transparent border border-slate-700 cursor-pointer"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm text-slate-400 mb-2">Font Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={settings.customColors.text}
                        onChange={(e) => handleColorChange('text', e.target.value)}
                        className="w-full h-10 bg-transparent border border-slate-700 cursor-pointer"
                    />
                </div>
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-sm text-slate-400">High Contrast Mode</span>
            <button
              onClick={() => updateSettings({ ...settings, highContrast: !settings.highContrast })}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.highContrast ? 'bg-spectral' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.highContrast ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-3 bg-blood/20 border border-blood text-blood hover:bg-blood hover:text-white transition-colors uppercase tracking-widest font-bold"
        >
          Save & Exit
        </button>
      </div>
    </div>
  );
};