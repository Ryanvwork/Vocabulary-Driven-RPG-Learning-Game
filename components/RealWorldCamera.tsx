import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, ScanLine, AlertTriangle, Upload, MapPinOff } from 'lucide-react';

interface RealWorldCameraProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
  onLocationFound: (coords: { lat: number; lng: number } | null) => void;
}

export const RealWorldCamera: React.FC<RealWorldCameraProps> = ({ onCapture, onClose, onLocationFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'success' | 'denied'>('pending');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera not accessible");
      }
    };
    startCamera();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onLocationFound({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationStatus('success');
            },
            (err) => {
                onLocationFound(null);
                setLocationStatus('denied');
            }
        );
    } else {
        onLocationFound(null);
        setLocationStatus('denied');
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setScanning(true);
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current!.videoWidth;
        canvas.height = videoRef.current!.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current!, 0, 0);
        const imageSrc = canvas.toDataURL('image/jpeg');
        onCapture(imageSrc);
    }, 800);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setScanning(true);
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              setTimeout(() => {
                  onCapture(result);
              }, 800);
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 pointer-events-none z-10 border-[20px] border-black/50">
         <div className="absolute top-4 left-4 text-blood font-mono text-xs animate-pulse">REC ●</div>
         
         <div className={`absolute top-4 right-4 font-mono text-xs flex items-center gap-2 ${locationStatus === 'success' ? 'text-spectral' : 'text-slate-500'}`}>
            {locationStatus === 'success' ? 'GEOLOCATION: LOCKED' : 'GEOLOCATION: OFFLINE'}
            {locationStatus === 'denied' && <MapPinOff size={14} />}
         </div>

         <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/50 font-mono text-xs text-center">
            ALIGN TARGET OR UPLOAD EVIDENCE
         </div>
         
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-spectral"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-spectral"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-spectral"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-spectral"></div>
         </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover transition-opacity duration-200 ${scanning ? 'opacity-50' : 'opacity-100'}`}
        />
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-8">
            <button onClick={onClose} className="p-4 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition">
                <X />
            </button>
            
            <button 
                onClick={handleCapture}
                disabled={scanning}
                className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 disabled:animate-pulse"
            >
                <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
            
            <div className="relative">
                <button 
                    className="p-4 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                />
            </div>
      </div>
      
      {scanning && (
          <div className="absolute inset-0 z-30 bg-spectral/20 flex items-center justify-center">
             <div className="w-full h-1 bg-spectral animate-glitch absolute top-1/2"></div>
             <p className="bg-black text-spectral font-bold px-2">ANALYZING VISUAL DATA...</p>
          </div>
      )}
    </div>
  );
};