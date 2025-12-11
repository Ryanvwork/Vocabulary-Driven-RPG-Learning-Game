import React, { useState, useRef } from 'react';
import { Camera, Wand2, Upload, Trash2 } from 'lucide-react';
import { editImageArtifact } from '../services/geminiService';

interface DarkroomProps {
  onBack: () => void;
}

export const Darkroom: React.FC<DarkroomProps> = ({ onBack }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Remove data url prefix for API, but keep for display? 
        // Gemini expects base64 data. 
        const result = ev.target?.result as string;
        setImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setProcessing(true);
    
    try {
      // Extract base64 content
      const base64Data = image.split(',')[1];
      const newImageData = await editImageArtifact(base64Data, prompt);
      setImage(`data:image/jpeg;base64,${newImageData}`);
      setPrompt('');
    } catch (error) {
      alert("Darkroom processing failed. The entity refused to manifest.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in p-4">
      <div className="flex items-center justify-between w-full max-w-2xl border-b border-slate-800 pb-4">
        <h2 className="text-3xl font-horror text-spectral">THE DARKROOM</h2>
        <button onClick={onBack} className="text-slate-500 hover:text-parchment text-sm uppercase tracking-widest">
          Exit Room
        </button>
      </div>

      <div className="relative w-full max-w-2xl aspect-video bg-slate-950 border-2 border-slate-800 border-dashed flex items-center justify-center overflow-hidden group">
        {image ? (
          <img src={image} alt="Artifact" className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-slate-600">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="uppercase tracking-widest text-xs">Upload Evidence</p>
          </div>
        )}
        
        {!image && (
            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileSelect}
            />
        )}
        
        {image && !processing && (
            <button 
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-900/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 size={16} />
            </button>
        )}

        {processing && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col z-20">
                <div className="w-12 h-12 border-4 border-spectral border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-spectral animate-pulse font-mono text-xs">DEVELOPING...</p>
            </div>
        )}
      </div>

      {image && (
        <div className="w-full max-w-2xl flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the alteration (e.g., 'Add a ghostly figure in the corner', 'Make the walls bleed')"
            className="flex-grow bg-slate-900 border border-slate-700 p-3 text-parchment focus:border-spectral outline-none font-mono text-sm"
          />
          <button
            onClick={handleEdit}
            disabled={processing || !prompt}
            className="px-6 bg-slate-800 border border-slate-600 hover:border-spectral hover:text-spectral disabled:opacity-50 transition-colors"
          >
            <Wand2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};