import React from 'react';
import { GameSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  shake?: boolean;
  settings?: GameSettings;
  backgroundImage?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, shake, settings, backgroundImage }) => {
  
  const fontClass = {
      'mono': 'font-mono',
      'sans': 'font-sans',
      'serif': 'font-serif',
      'horror': 'font-horror'
  }[settings?.fontFamily || 'mono'];

  // Apply custom colors if present, otherwise default to Void theme
  const customStyle = settings?.customColors ? {
      backgroundColor: settings.customColors.background,
      color: settings.customColors.text
  } : {};

  return (
    <div 
        className={`min-h-screen relative overflow-hidden flex flex-col transition-colors duration-300 ${shake ? 'animate-shake' : ''} ${fontClass}`}
        style={customStyle}
    >
        {/* Background fallback */}
        {!settings?.customColors.background && <div className="absolute inset-0 bg-void -z-10" />}
        
        {/* Generated Scene Image Background */}
        {backgroundImage && (
            <div 
                className="absolute inset-0 -z-10 bg-cover bg-center transition-opacity duration-1000 animate-fade-in opacity-40 mix-blend-overlay"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            />
        )}

      {/* CRT Scanline Overlay - Optional based on contrast/preference? Keeping it for vibe unless High Contrast */}
      {!settings?.highContrast && (
        <div className="absolute inset-0 z-50 crt-overlay opacity-30 pointer-events-none mix-blend-overlay"></div>
      )}
      
      {/* Vignette - Only if not high contrast */}
      {!settings?.highContrast && (
        <div className="absolute inset-0 z-40 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]"></div>
      )}

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
      
      {/* Status Bar / Footer */}
      <footer className="relative z-20 p-2 text-center text-xs opacity-50 border-t border-current">
        LEXICON ENGINE v2.5 // STATUS: ONLINE // GOOGLE GEMINI
      </footer>
    </div>
  );
};