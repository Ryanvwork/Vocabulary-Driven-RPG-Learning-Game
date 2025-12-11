import React, { useEffect, useRef } from 'react';

interface GhostEntity {
  id: number;
  word: string;
  level: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  eyeOffsetX: number;
  eyeOffsetY: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface MonsterEntity {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  angle: number; 
}

interface GhostOverlayProps {
  onEliminate: () => void;
  onDamage: (amount: number) => void;
}

const PRESET_VOCAB = [
  { word: "Lurking", level: "B2" },
  { word: "Ethereal", level: "C2" },
  { word: "Dread", level: "C1" },
  { word: "Omen", level: "C1" },
  { word: "Abyss", level: "C2" },
  { word: "Petrified", level: "B2" },
  { word: "Malevolent", level: "C2" },
  { word: "Distorted", level: "B2" },
  { word: "Ephemeral", level: "C2" },
  { word: "Cacophony", level: "C2" }
];

const MONSTER_WORDS = ["DEATH", "FEAR", "PAIN", "VOID", "RUN", "DIE"];

export const GhostOverlay: React.FC<GhostOverlayProps> = ({ onEliminate, onDamage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // State refs to avoid react re-renders
  const gameState = useRef({
    ghosts: [] as GhostEntity[],
    particles: [] as Particle[],
    monsters: [] as MonsterEntity[],
    mouseX: 0,
    mouseY: 0,
    lastMonsterSpawn: Date.now(),
    width: window.innerWidth,
    height: window.innerHeight,
    shake: 0,
    initialized: false
  });

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playSound = (type: 'ghost' | 'monster' | 'hit') => {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        if (type === 'ghost') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'monster') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
    } catch (e) { console.error(e); }
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = Math.random() * speed;
        gameState.current.particles.push({
            id: Math.random(),
            x, y,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            life: 1.0,
            color,
            size: Math.random() * 3 + 1
        });
    }
  };

  const createGhost = (): GhostEntity => {
    const vocab = PRESET_VOCAB[Math.floor(Math.random() * PRESET_VOCAB.length)];
    const w = gameState.current.width || window.innerWidth;
    const h = gameState.current.height || window.innerHeight;
    return {
        id: Math.random(),
        ...vocab,
        x: Math.random() * (w - 100) + 50,
        y: Math.random() * (h - 100) + 50,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 30,
        color: '#00ffea',
        eyeOffsetX: 0,
        eyeOffsetY: 0
    };
  };

  const createMonster = (): MonsterEntity => {
    const w = gameState.current.width || window.innerWidth;
    const h = gameState.current.height || window.innerHeight;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const padding = 100;
    
    if (edge === 0) { x = Math.random() * w; y = -padding; }
    else if (edge === 1) { x = w + padding; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + padding; }
    else { x = -padding; y = Math.random() * h; }

    return {
        id: Math.random(),
        word: MONSTER_WORDS[Math.floor(Math.random() * MONSTER_WORDS.length)],
        x, y,
        speed: 3 + Math.random() * 2,
        angle: 0
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Correctly size canvas immediately
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameState.current.width = window.innerWidth;
    gameState.current.height = window.innerHeight;

    // Resize handler
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gameState.current.width = window.innerWidth;
        gameState.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse handler
    const handleMouseMove = (e: MouseEvent) => {
        gameState.current.mouseX = e.clientX;
        gameState.current.mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Interaction handler
    const handleClick = (e: MouseEvent) => {
        const mx = e.clientX;
        const my = e.clientY;
        let hit = false;

        // Check Ghosts
        const ghosts = gameState.current.ghosts;
        for (let i = ghosts.length - 1; i >= 0; i--) {
            const g = ghosts[i];
            const dx = mx - g.x;
            const dy = my - g.y;
            if (dx*dx + dy*dy < g.radius * g.radius * 2) { 
                playSound('ghost');
                onEliminate();
                spawnParticles(g.x, g.y, g.color, 20, 5);
                ghosts.splice(i, 1);
                hit = true;
                setTimeout(() => {
                    gameState.current.ghosts.push(createGhost());
                }, 2000);
                break;
            }
        }

        if (!hit) {
            const monsters = gameState.current.monsters;
            for (let i = monsters.length - 1; i >= 0; i--) {
                const m = monsters[i];
                const dx = mx - m.x;
                const dy = my - m.y;
                if (dx*dx + dy*dy < 50*50) {
                    playSound('monster');
                    onEliminate();
                    spawnParticles(m.x, m.y, '#ffffff', 30, 8);
                    monsters.splice(i, 1);
                    hit = true;
                    break;
                }
            }
        }

        if (!hit) {
            onDamage(1); 
        }
    };
    window.addEventListener('mousedown', handleClick);

    // Init Ghosts (Prevent doubles in strict mode)
    if (!gameState.current.initialized) {
        for (let i = 0; i < 5; i++) {
            gameState.current.ghosts.push(createGhost());
        }
        gameState.current.initialized = true;
    }

    // Animation Loop
    let animationFrameId: number;

    const render = () => {
        // Use clearRect for stability, then semi-transparent fill for trail
        // To fix black screen issue: Ensure we aren't painting full opaque black over time
        // ctx.clearRect(0, 0, canvas.width, canvas.height); 
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Shake offset
        const shake = gameState.current.shake;
        if (shake > 0) {
            const sx = (Math.random() - 0.5) * shake;
            const sy = (Math.random() - 0.5) * shake;
            ctx.save();
            ctx.translate(sx, sy);
            gameState.current.shake *= 0.9;
            if (gameState.current.shake < 0.5) gameState.current.shake = 0;
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // --- Logic: Spawns ---
        if (Date.now() - gameState.current.lastMonsterSpawn > 2500) {
            if (Math.random() > 0.6) {
                gameState.current.monsters.push(createMonster());
            }
            gameState.current.lastMonsterSpawn = Date.now();
        }

        // --- Logic: Monsters ---
        for (let i = gameState.current.monsters.length - 1; i >= 0; i--) {
            const m = gameState.current.monsters[i];
            const dx = centerX - m.x;
            const dy = centerY - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 40) {
                playSound('hit');
                onDamage(10);
                gameState.current.shake = 30;
                spawnParticles(centerX, centerY, '#8a0303', 50, 10);
                gameState.current.monsters.splice(i, 1);
                continue;
            }

            const angle = Math.atan2(dy, dx);
            m.x += Math.cos(angle) * m.speed;
            m.y += Math.sin(angle) * m.speed;

            // Draw Monster
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.fillStyle = '#050505';
            ctx.strokeStyle = '#8a0303';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let j = 0; j < 8; j++) {
                const a = (j / 8) * Math.PI * 2;
                const r = 30 + Math.random() * 10;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 16px "Courier Prime", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(m.word, 0, 0);
            ctx.restore();
        }

        // --- Logic: Ghosts ---
        gameState.current.ghosts.forEach(g => {
            // Move
            g.x += g.vx;
            g.y += g.vy;
            if (g.x < 30 || g.x > canvas.width - 30) g.vx *= -1;
            if (g.y < 30 || g.y > canvas.height - 30) g.vy *= -1;

            const dx = gameState.current.mouseX - g.x;
            const dy = gameState.current.mouseY - g.y;
            const angle = Math.atan2(dy, dx);
            g.eyeOffsetX = Math.cos(angle) * 5;
            g.eyeOffsetY = Math.sin(angle) * 5;

            // Draw Ghost
            ctx.save();
            ctx.translate(g.x, g.y);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = g.color;
            
            ctx.fillStyle = 'rgba(200, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-10 + g.eyeOffsetX * 0.5, -5 + g.eyeOffsetY * 0.5, 6, 0, Math.PI * 2);
            ctx.arc(10 + g.eyeOffsetX * 0.5, -5 + g.eyeOffsetY * 0.5, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#00ffea';
            ctx.beginPath();
            ctx.arc(-10 + g.eyeOffsetX, -5 + g.eyeOffsetY, 2, 0, Math.PI * 2);
            ctx.arc(10 + g.eyeOffsetX, -5 + g.eyeOffsetY, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px "Courier Prime", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(g.word, 0, 45);
            
            ctx.restore();
        });

        // --- Logic: Particles ---
        for (let i = gameState.current.particles.length - 1; i >= 0; i--) {
            const p = gameState.current.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life <= 0) {
                gameState.current.particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        if (gameState.current.shake > 0) ctx.restore(); // Restore shake
        animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 cursor-crosshair flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
        <div className="absolute top-8 w-full text-center pointer-events-none z-10">
            <h2 className="text-blood font-horror text-4xl animate-pulse tracking-widest drop-shadow-[0_0_10px_rgba(138,3,3,0.8)]">
                LOADING REALITY...
            </h2>
            <p className="text-slate-400 text-sm mt-2 font-mono">Purge the entities to maintain sanity</p>
        </div>
    </div>
  );
};