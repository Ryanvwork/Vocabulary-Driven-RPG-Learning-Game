import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Tooltip } from './components/Tooltip';
import { SettingsModal } from './components/SettingsModal';
import { AuthForm } from './components/AuthForm';
import { Darkroom } from './components/Darkroom';
import { RealWorldCamera } from './components/RealWorldCamera';
import { GhostOverlay } from './components/GhostOverlay';
import { GameState, GameMode, Genre, VocabularyWord, StorySegment, GameSettings, User, ReviewEncounter, ExamType, CEFRLevel, Buff, BodyPartType, Chapter, Item } from './types';
import { extractVocabularyFromText, generateStorySegment, generateReviewEncounter, generateRealWorldStart, generateVocabularyFromSettings, generateSceneImage, attemptCrafting } from './services/geminiService';
import { 
  BookOpen, Skull, Settings, EyeOff, ShieldAlert, Image as ImageIcon, 
  LogOut, Send, MapPin, BrainCircuit, ImagePlus, Heart, Zap, Briefcase, 
  Eye, Crosshair, User as PersonIcon, Save, Trash2, FileText, Download, 
  Sword, Shield, Utensils, Box, Hammer, ChevronsUp, ChevronsDown, 
  ChevronRight, Droplets, Bandage, Lock
} from 'lucide-react';

const INITIAL_SETTINGS: GameSettings = {
  fontSize: 'medium',
  highContrast: false,
  language: 'en',
  difficulty: 'B2',
  fontFamily: 'serif',
  customColors: { background: '#050505', text: '#e5e5e5' },
  enableImageGeneration: true
};

const INITIAL_ITEMS: Item[] = [
    { id: '1', name: "Flashlight", type: "misc", description: "Flickering beam." },
    { id: '2', name: "Water Ration", type: "consumable", description: "Clean water.", effectValue: 15 }
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    user: null,
    mode: GameMode.INTRO, 
    body: { head: 100, torso: 100, arms: 100, legs: 100 },
    maxHealth: 100,
    sanity: 100,
    maxSanity: 100,
    inventory: INITIAL_ITEMS,
    equipped: { weapon: null, armor: null },
    buffs: [],
    vocabulary: [],
    artifacts: [],
    grimoireOpen: false,
    history: [],
    chapters: [],
    settings: INITIAL_SETTINGS,
    genre: Genre.COSMIC,
    customTextContext: ""
  });

  const [currentSegment, setCurrentSegment] = useState<StorySegment | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [customAction, setCustomAction] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [damageFlash, setDamageFlash] = useState<'none' | 'warning' | 'critical'>('none');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [isCraftingMode, setIsCraftingMode] = useState(false);
  const [craftingIngredients, setCraftingIngredients] = useState<Item[]>([]);
  const [craftingIntent, setCraftingIntent] = useState('');

  const storyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('lexicon_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        let savedVocab: VocabularyWord[] = [];
        let savedChapters: Chapter[] = [];
        if (!user.isGuest) {
            const vocabData = localStorage.getItem(`lexicon_vocab_${user.id}`);
            if (vocabData) savedVocab = JSON.parse(vocabData);
            
            const chapterData = localStorage.getItem(`lexicon_chapters_${user.id}`);
            if (chapterData) savedChapters = JSON.parse(chapterData);
        }
        setGameState(prev => ({ ...prev, user, mode: GameMode.INTRO, vocabulary: savedVocab, chapters: savedChapters }));
    }
  }, []);

  useEffect(() => {
    if (gameState.user && !gameState.user.isGuest) {
        if (gameState.vocabulary.length > 0) {
            localStorage.setItem(`lexicon_vocab_${gameState.user.id}`, JSON.stringify(gameState.vocabulary));
        }
        localStorage.setItem(`lexicon_chapters_${gameState.user.id}`, JSON.stringify(gameState.chapters));
    }
  }, [gameState.vocabulary, gameState.chapters, gameState.user]);

  useEffect(() => {
      if (damageFlash !== 'none') {
          const timer = setTimeout(() => setDamageFlash('none'), 1500); 
          return () => clearTimeout(timer);
      }
  }, [damageFlash]);

  const updateStatus = useCallback((sanityDelta: number, damageTarget?: BodyPartType, damageAmount?: number) => {
    setGameState(prev => {
      let newSanity = Math.min(prev.maxSanity, Math.max(0, prev.sanity + sanityDelta));
      let newBody = { ...prev.body };
      let newMode = prev.mode;

      if (damageTarget && damageAmount && damageAmount > 0) {
          newBody[damageTarget] = Math.max(0, newBody[damageTarget] - damageAmount);
          if (damageTarget === 'head' || damageTarget === 'torso') {
              setDamageFlash('critical');
              if (newBody[damageTarget] <= 0) newMode = GameMode.GAMEOVER;
          } else {
              setDamageFlash('warning');
          }
      }

      if (newSanity <= 0) newMode = GameMode.GAMEOVER;
      return { ...prev, sanity: newSanity, body: newBody, mode: newMode };
    });
  }, []);

  const handleGhostEliminate = useCallback(() => updateStatus(2), [updateStatus]);
  const handleGhostDamage = useCallback((amount: number) => updateStatus(-amount), [updateStatus]);

  const handleLogin = (user: User) => {
    let savedVocab: VocabularyWord[] = [];
    let savedChapters: Chapter[] = [];
    if (!user.isGuest) {
        const data = localStorage.getItem(`lexicon_vocab_${user.id}`);
        if (data) savedVocab = JSON.parse(data);
        const chData = localStorage.getItem(`lexicon_chapters_${user.id}`);
        if (chData) savedChapters = JSON.parse(chData);
    }
    setGameState(prev => ({ ...prev, user, mode: GameMode.INTRO, vocabulary: savedVocab, chapters: savedChapters }));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lexicon_user');
    setGameState(prev => ({ ...prev, user: null, mode: GameMode.INTRO, vocabulary: [], history: [], chapters: [] }));
  };

  const processBuffs = () => {
      setGameState(prev => {
          let currentSanity = prev.sanity;
          let currentBody = { ...prev.body };
          const updatedBuffs = prev.buffs
              .map(b => {
                  if (b.sanityChangePerTurn) currentSanity += b.sanityChangePerTurn;
                  if (b.healthChangePerTurn) currentBody.torso = Math.min(100, currentBody.torso + b.healthChangePerTurn);
                  return { ...b, duration: b.duration - 1 };
              })
              .filter(b => b.duration > 0);
          
          currentSanity = Math.min(prev.maxSanity, Math.max(0, currentSanity));
          
          if (currentSanity <= 0) return { ...prev, buffs: updatedBuffs, sanity: currentSanity, body: currentBody, mode: GameMode.GAMEOVER };
          return { ...prev, buffs: updatedBuffs, sanity: currentSanity, body: currentBody };
      });
  };

  const saveChapter = () => {
      const fullText = gameState.history.filter(h => h.startsWith("Narrative:")).map(h => h.replace("Narrative: ", "")).join("\n\n");
      if (!fullText) return;
      const newChapter: Chapter = {
          id: Date.now().toString(),
          title: `Session ${new Date().toLocaleDateString()} - ${gameState.genre}`,
          fullText: fullText,
          date: Date.now(),
          usedVocab: gameState.vocabulary.filter(v => fullText.includes(v.word)).map(v => v.word)
      };
      setGameState(prev => ({
          ...prev,
          chapters: [...prev.chapters, newChapter],
          history: [], 
          mode: GameMode.INTRO
      }));
  };

  const generateNextSegment = async (
    history: string[], 
    vocab: VocabularyWord[], 
    genre: Genre, 
    sanity: number, 
    body: any
  ) => {
    setLoading(true);
    try {
        const segment = await generateStorySegment(
            history, 
            vocab, 
            genre, 
            sanity, 
            body, 
            gameState.settings.difficulty, 
            gameState.chapters,
            gameState.examFocus
        );
        setCurrentSegment(segment);
        setLoading(false);

        setGameState(prev => {
            const updatedVocab = prev.vocabulary.map(v => {
                if (segment.highlightedWords.some(hw => hw.toLowerCase().includes(v.word.toLowerCase()))) {
                    return { ...v, seenCount: (v.seenCount || 0) + 1 };
                }
                return v;
            });
            const newDefinitions = segment.newVocabDefinitions || [];
            for (const def of newDefinitions) {
                if (!updatedVocab.find(v => v.word === def.word)) updatedVocab.push({ ...def, seenCount: 1 });
            }
            const currentItems = [...prev.inventory];
            if (segment.newItems) {
                segment.newItems.forEach(item => {
                   const newItem = { ...item, id: `${item.id}-${Date.now()}` };
                   currentItems.push(newItem);
                });
            }
            return { ...prev, vocabulary: updatedVocab, inventory: currentItems };
        });

        if (gameState.settings.enableImageGeneration && segment.backgroundAmbience) {
            generateSceneImage(segment.backgroundAmbience, genre).then(imageUrl => {
                if (imageUrl) setCurrentSegment(prev => prev ? { ...prev, imageUrl } : null);
            });
        }
    } catch (e) {
        setLoading(false);
    }
  };

  const handleChoice = (choiceId: string, choiceText: string, sanityImpact: number, damageTarget?: BodyPartType, damageAmount?: number, newBuff?: Buff) => {
    updateStatus(sanityImpact, damageTarget, damageAmount);
    if (newBuff) {
        setGameState(prev => ({ ...prev, buffs: [...prev.buffs, newBuff] }));
    }
    processBuffs();

    const newHistory = [...gameState.history];
    if (currentSegment) newHistory.push(`Narrative: ${currentSegment.narrative}`);
    
    const actionLog = choiceId === 'custom' ? `User Action: ${choiceText}` : `Choice: ${choiceText}`;
    newHistory.push(actionLog);

    setGameState(prev => ({ ...prev, history: newHistory }));
    setGameState(current => {
        generateNextSegment(newHistory, current.vocabulary, current.genre, current.sanity, current.body);
        return current;
    });
    setCustomAction(''); 
  };

  const handleCraftingAttempt = async () => {
      if (craftingIngredients.length === 0 || !craftingIntent.trim()) return;
      setLoading(true);
      
      const result = await attemptCrafting(craftingIngredients, craftingIntent);
      setLoading(false);

      setGameState(prev => {
          let newInv = [...prev.inventory];
          if (result.success && result.consumedItemIds.length > 0) {
              newInv = newInv.filter(i => !result.consumedItemIds.includes(i.id));
          }
          if (result.success && result.createdItem) {
              newInv.push({ ...result.createdItem, id: `crafted-${Date.now()}` });
          }
          return { ...prev, inventory: newInv };
      });
      
      setIsCraftingMode(false);
      setCraftingIngredients([]);
      setCraftingIntent('');
      
      handleChoice('crafting', `Attempted to craft: ${craftingIntent}. Result: ${result.message}`, 0);
  };

  const handleInventoryAction = (action: 'equip' | 'unequip' | 'consume' | 'drop', item: Item) => {
      setSelectedItem(null);
      let logMessage = "";
      
      setGameState(prev => {
          const newInv = [...prev.inventory];
          const newEquipped = { ...prev.equipped };
          const newBody = { ...prev.body };

          if (action === 'equip') {
              if (item.type === 'weapon') {
                  if (newEquipped.weapon) newInv.push(newEquipped.weapon);
                  newEquipped.weapon = item;
                  logMessage = `Equipped weapon: ${item.name}`;
              } else if (item.type === 'armor') {
                  if (newEquipped.armor) newInv.push(newEquipped.armor);
                  newEquipped.armor = item;
                  logMessage = `Equipped armor: ${item.name}`;
              }
              const idx = newInv.findIndex(i => i.id === item.id);
              if (idx > -1) newInv.splice(idx, 1);
          } else if (action === 'unequip') {
              if (item.type === 'weapon') newEquipped.weapon = null;
              if (item.type === 'armor') newEquipped.armor = null;
              newInv.push(item);
              logMessage = `Unequipped ${item.name}`;
          } else if (action === 'consume') {
              if (item.effectValue) newBody.torso = Math.min(100, newBody.torso + item.effectValue);
              const idx = newInv.findIndex(i => i.id === item.id);
              if (idx > -1) newInv.splice(idx, 1);
              logMessage = `Consumed ${item.name}.`;
          } else if (action === 'drop') {
              const idx = newInv.findIndex(i => i.id === item.id);
              if (idx > -1) newInv.splice(idx, 1);
              logMessage = `Dropped ${item.name}`;
          }

          return { ...prev, inventory: newInv, equipped: newEquipped, body: newBody };
      });

      setTimeout(() => {
        handleChoice('inventory_action', logMessage, 0); 
      }, 100);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!e.currentTarget) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPerc = x / rect.width;
      const yPerc = y / rect.height;
      
      let location = "center";
      if (yPerc < 0.33) location = "top";
      else if (yPerc > 0.66) location = "bottom";
      
      if (xPerc < 0.33) location += "-left";
      else if (xPerc > 0.66) location += "-right";
      
      const prompt = `Investigates the ${location} area of the scene.`;
      handleChoice('custom', prompt, 0);
  };

  const handleQuickStart = async () => {
    setLoading(true);
    const vocab = await generateVocabularyFromSettings(gameState.settings.difficulty, selectedExam || undefined);
    setGameState(prev => ({
        ...prev,
        vocabulary: [...prev.vocabulary, ...vocab.filter(nv => !prev.vocabulary.some(ev => ev.word === nv.word))],
        mode: GameMode.GAMEPLAY,
        customTextContext: "",
        examFocus: selectedExam || undefined,
        body: { head: 100, torso: 100, arms: 100, legs: 100 },
        history: [],
        sanity: 100
    }));
    generateNextSegment([], [...gameState.vocabulary, ...vocab], gameState.genre, 100, { head: 100, torso: 100, arms: 100, legs: 100 });
  };

  const renderStatusCorner = () => (
      <div 
        className={`absolute top-4 left-4 z-40 bg-black/80 border transition-all duration-300 rounded backdrop-blur-sm max-w-[200px] overflow-hidden
            ${damageFlash === 'critical' ? 'animate-flash-critical border-red-500' : 
              damageFlash === 'warning' ? 'animate-flash-once border-orange-500' : 'border-slate-700'}
            ${isStatusExpanded ? 'max-h-[300px] p-3' : 'max-h-[40px] p-2'}
        `}
      >
          <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                 <BrainCircuit size={12}/> {isStatusExpanded ? 'STATUS MONITOR' : `${gameState.sanity}% SANITY`}
              </span>
              <button onClick={() => setIsStatusExpanded(!isStatusExpanded)} className="text-slate-500 hover:text-white">
                  {isStatusExpanded ? <ChevronsUp size={14} /> : <ChevronsDown size={14} />}
              </button>
          </div>

          <div className={`transition-opacity duration-300 ${isStatusExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
            <div className="flex flex-col gap-3 mb-2">
                <div>
                    <div className="flex items-center justify-between text-xs font-bold text-spectral mb-1">
                        <span className="flex items-center gap-1"><BrainCircuit size={12}/> SANITY</span>
                        <span>{gameState.sanity}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-spectral transition-all duration-500" style={{ width: `${gameState.sanity}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between text-xs font-bold text-blood mb-1 border-b border-slate-800 pb-1">
                        <span className="flex items-center gap-1"><PersonIcon size={12}/> BODY</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <div className="flex justify-between items-center">
                            <span className={`flex items-center gap-1 ${gameState.body.head < 30 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                                <Skull size={10} /> HEAD
                            </span>
                            <span className="text-slate-200">{gameState.body.head}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`flex items-center gap-1 ${gameState.body.torso < 30 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                                <Heart size={10} /> TORSO
                            </span>
                            <span className="text-slate-200">{gameState.body.torso}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`flex items-center gap-1 ${gameState.body.arms < 10 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                                <Zap size={10} /> ARMS
                            </span>
                            <span className="text-slate-200">{gameState.body.arms}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`flex items-center gap-1 ${gameState.body.legs < 10 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                                <Zap size={10} /> LEGS
                            </span>
                            <span className="text-slate-200">{gameState.body.legs}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="space-y-1 mt-2">
                {gameState.buffs.map((buff, i) => (
                    <div key={i} className={`text-[10px] px-1 py-0.5 rounded flex justify-between ${buff.type === 'buff' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        <span>{buff.name}</span>
                        <span>{buff.duration}t</span>
                    </div>
                ))}
            </div>
          </div>
      </div>
  );

  const renderInventoryCorner = () => (
      <div className="absolute bottom-4 right-4 z-40 bg-black/95 border border-slate-700 p-3 rounded backdrop-blur-sm w-[240px]">
          <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <Briefcase size={12} /> INVENTORY
              </div>
              <button 
                onClick={() => { setIsCraftingMode(!isCraftingMode); setCraftingIngredients([]); }}
                className={`text-[10px] px-2 py-0.5 rounded border ${isCraftingMode ? 'border-spectral text-spectral' : 'border-slate-600 text-slate-400'}`}
              >
                  <Hammer size={10} className="inline mr-1"/> CRAFT
              </button>
          </div>
          
          {isCraftingMode && (
              <div className="mb-2 bg-slate-900 p-2 border border-slate-800 animate-fade-in">
                  <div className="text-[10px] text-slate-400 mb-1">Select items below, then describe:</div>
                  <input 
                      type="text" 
                      value={craftingIntent}
                      onChange={(e) => setCraftingIntent(e.target.value)}
                      placeholder="E.g. Combine cloth and alcohol..."
                      className="w-full bg-black border border-slate-700 p-1 text-[10px] text-white mb-1"
                  />
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] text-spectral">{craftingIngredients.length} selected</span>
                      <button 
                        onClick={handleCraftingAttempt}
                        disabled={craftingIngredients.length === 0 || !craftingIntent}
                        className="bg-spectral/20 text-spectral text-[10px] px-2 py-1 hover:bg-spectral/40 disabled:opacity-50"
                      >
                          ATTEMPT
                      </button>
                  </div>
              </div>
          )}

          {!isCraftingMode && (
              <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => gameState.equipped.weapon && handleInventoryAction('unequip', gameState.equipped.weapon)}
                    className={`flex-1 h-14 border flex flex-col items-center justify-center text-[10px] transition-colors ${gameState.equipped.weapon ? 'border-spectral bg-slate-800 text-white' : 'border-slate-700 bg-slate-900 text-slate-600'}`}
                    title="Weapon Slot"
                  >
                      <Sword size={14} className="mb-1" />
                      <span className="truncate w-full text-center px-1">{gameState.equipped.weapon?.name || 'Empty'}</span>
                  </button>
                  
                  <button 
                    onClick={() => gameState.equipped.armor && handleInventoryAction('unequip', gameState.equipped.armor)}
                    className={`flex-1 h-14 border flex flex-col items-center justify-center text-[10px] transition-colors ${gameState.equipped.armor ? 'border-spectral bg-slate-800 text-white' : 'border-slate-700 bg-slate-900 text-slate-600'}`}
                    title="Armor Slot"
                  >
                      <Shield size={14} className="mb-1" />
                      <span className="truncate w-full text-center px-1">{gameState.equipped.armor?.name || 'Empty'}</span>
                  </button>
              </div>
          )}

          <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                  const item = gameState.inventory[i];
                  const isSelectedForCrafting = item && craftingIngredients.find(ci => ci.id === item.id);
                  
                  return (
                      <div 
                        key={i} 
                        className={`
                            aspect-square border bg-slate-900 flex items-center justify-center relative group cursor-pointer 
                            ${isSelectedForCrafting ? 'border-spectral ring-1 ring-spectral' : (item ? 'border-slate-600 hover:border-slate-400' : 'border-slate-800')}
                        `}
                        onClick={() => {
                            if (!item) return;
                            if (isCraftingMode) {
                                if (isSelectedForCrafting) {
                                    setCraftingIngredients(prev => prev.filter(p => p.id !== item.id));
                                } else {
                                    setCraftingIngredients(prev => [...prev, item]);
                                }
                            } else {
                                setSelectedItem(item);
                            }
                        }}
                      >
                          {item && (
                             <>
                                {item.type === 'weapon' && <Sword size={12} className="text-slate-400" />}
                                {item.type === 'armor' && <Shield size={12} className="text-slate-400" />}
                                {item.type === 'consumable' && (item.name.toLowerCase().includes('water') ? <Droplets size={12} className="text-blue-400"/> : <Utensils size={12} className="text-slate-400" />)}
                                {item.type === 'misc' && <Box size={12} className="text-slate-400" />}
                             </>
                          )}
                      </div>
                  );
              })}
          </div>

          {selectedItem && !isCraftingMode && (
             <div className="absolute bottom-full right-0 mb-2 w-48 bg-black border border-spectral p-2 rounded shadow-xl animate-fade-in z-50">
                 <div className="text-sm font-bold text-spectral mb-1">{selectedItem.name}</div>
                 <div className="text-[10px] text-slate-400 mb-2 italic">{selectedItem.description}</div>
                 <div className="grid grid-cols-1 gap-1">
                     {(selectedItem.type === 'weapon' || selectedItem.type === 'armor') && (
                         <button onClick={() => handleInventoryAction('equip', selectedItem)} className="text-xs bg-slate-800 hover:bg-slate-700 py-1 px-2 text-left flex items-center gap-2"><Sword size={10}/> Equip</button>
                     )}
                     {selectedItem.type === 'consumable' && (
                         <button onClick={() => handleInventoryAction('consume', selectedItem)} className="text-xs bg-slate-800 hover:bg-slate-700 py-1 px-2 text-left flex items-center gap-2"><Utensils size={10}/> Consume</button>
                     )}
                     <button onClick={() => handleInventoryAction('drop', selectedItem)} className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 py-1 px-2 text-left flex items-center gap-2"><Trash2 size={10}/> Drop</button>
                     <button onClick={() => setSelectedItem(null)} className="text-xs text-slate-500 py-1 px-2 text-left hover:text-white">Cancel</button>
                 </div>
             </div>
          )}
      </div>
  );

  const renderRadarCorner = () => {
      if (!currentSegment?.nearbyEntities || currentSegment.nearbyEntities.length === 0) return null;
      
      return (
        <div className="absolute top-4 right-20 z-40">
           <div className="bg-black/90 border border-slate-700 p-2 rounded backdrop-blur-sm w-48">
              <div className="text-[10px] font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>PROXIMITY SENSOR</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                  {currentSegment.nearbyEntities.map((entity, idx) => (
                      <div key={idx} className="flex flex-col text-[10px]">
                          <div className="flex justify-between items-center text-slate-300">
                             <span className="font-bold">{entity.name}</span>
                             <span className={`uppercase ${
                                 entity.distance === 'near' ? 'text-red-500' : 
                                 entity.distance === 'lurking' ? 'text-yellow-600' : 'text-slate-500'
                             }`}>{entity.distance}</span>
                          </div>
                          <span className="text-slate-600 italic text-[9px]">{entity.status}</span>
                      </div>
                  ))}
              </div>
           </div>
        </div>
      );
  };

  const renderChapters = () => (
      <div className="w-full max-w-md bg-slate-900/50 p-4 border border-slate-800 mt-4 max-h-40 overflow-y-auto">
          <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Archives</h3>
          {gameState.chapters.length === 0 ? (
              <div className="text-xs text-slate-600 italic">No previous records found.</div>
          ) : (
              <div className="space-y-2">
                  {gameState.chapters.map(chap => (
                      <div key={chap.id} className="text-xs text-slate-400 hover:text-white cursor-pointer flex justify-between">
                          <span>{chap.title}</span>
                          <span className="opacity-50">{new Date(chap.date).toLocaleDateString()}</span>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderGameplay = () => {
    if (!currentSegment) return null;

    const words = currentSegment.narrative.split(' ');
    const renderedText = words.map((word, idx) => {
      const cleanWord = word.replace(/[.,/#!?$%^&*;:{}=\-_`~()]/g, "");
      const isVocab = currentSegment.highlightedWords.some(hw => cleanWord.toLowerCase().includes(hw.toLowerCase()));
      const vocabData = gameState.vocabulary.find(v => v.word.toLowerCase() === cleanWord.toLowerCase());
      return isVocab ? <React.Fragment key={idx}><Tooltip word={cleanWord} vocabData={vocabData}>{word}</Tooltip>{' '}</React.Fragment> : word + ' ';
    });

    return (
      <div className="h-full w-full flex flex-col pt-16 pb-4 px-4 relative">
          {renderStatusCorner()}
          {renderRadarCorner()}
          {renderInventoryCorner()}

          <div className="flex flex-col lg:flex-row h-full gap-4">
              
              <div className={`flex flex-col h-full lg:w-1/2 overflow-hidden ${currentSegment.visualCue === 'shake' ? 'animate-shake' : ''}`}>
                   <div 
                        ref={storyContainerRef}
                        className={`flex-grow overflow-y-auto pr-2 custom-scrollbar leading-loose text-lg text-justify font-${gameState.settings.fontFamily}`}
                    >
                      <p>{renderedText}</p>
                   </div>

                   <div className="mt-4 space-y-2">
                      {gameState.body.legs < 10 && <div className="text-xs text-red-500 font-bold bg-red-900/20 p-2 text-center flex items-center justify-center gap-2"><Bandage size={14}/> LEGS CRITICAL: CRAWLING ONLY</div>}
                      {gameState.body.arms < 10 && <div className="text-xs text-red-500 font-bold bg-red-900/20 p-2 text-center flex items-center justify-center gap-2"><Bandage size={14}/> ARMS CRITICAL: GRIP LOST</div>}

                      {currentSegment.choices.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoice(choice.id, choice.text, choice.sanityImpact, choice.damageTarget, choice.damageAmount, choice.addedBuff)}
                          className="w-full text-left p-3 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-spectral transition-all group relative overflow-hidden text-sm"
                        >
                          <div className="flex justify-between items-center">
                              <span className="font-bold group-hover:text-white relative z-10 flex items-center gap-2"><ChevronRight size={14}/> {choice.text}</span>
                          </div>
                          <div className="flex gap-2 mt-1 text-[10px] opacity-60 pl-6">
                              {choice.damageAmount && choice.damageAmount > 0 && (
                                  <span className="text-red-500 flex items-center gap-1 uppercase">
                                      <Heart size={8}/> Risk: {choice.damageTarget}
                                  </span>
                              )}
                              {choice.sanityImpact < 0 && <span className="text-spectral flex items-center gap-1"><BrainCircuit size={8}/> STRESS</span>}
                          </div>
                        </button>
                      ))}

                      <form onSubmit={(e) => { e.preventDefault(); if(customAction.trim()) handleChoice('custom', customAction, 0); }} className="relative">
                        <input 
                            type="text" 
                            value={customAction}
                            onChange={(e) => setCustomAction(e.target.value)}
                            placeholder="Attempt custom action..."
                            className="w-full bg-slate-950 border border-slate-700 p-3 pr-10 text-xs text-parchment focus:border-spectral outline-none"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-spectral"><Send size={16}/></button>
                      </form>
                      
                      <button 
                        onClick={saveChapter}
                        className="w-full py-2 bg-slate-900 border border-slate-700 text-slate-500 hover:text-white text-xs uppercase flex items-center justify-center gap-2"
                      >
                          <Save size={14}/> End Simulation & Save Chapter
                      </button>
                   </div>
              </div>

              <div className="hidden lg:flex lg:w-1/2 h-full bg-black border border-slate-800 relative items-center justify-center overflow-hidden group">
                  {currentSegment.imageUrl ? (
                      <div className="relative w-full h-full cursor-crosshair" onClick={handleImageClick}>
                          <img src={currentSegment.imageUrl} alt="Scene" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 uppercase tracking-widest bg-black/50 px-2 py-1 rounded pointer-events-none flex items-center gap-1">
                              <Crosshair size={10}/> Click image to investigate
                          </div>
                      </div>
                  ) : (
                      <div className="text-slate-600 flex flex-col items-center">
                          <EyeOff size={48} className="mb-2 opacity-20" />
                          <span className="text-xs uppercase tracking-widest opacity-50">Visual Feed Offline</span>
                      </div>
                  )}
              </div>
          </div>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in pb-10">
      <h1 className="text-6xl md:text-8xl font-horror text-blood drop-shadow-[0_0_10px_rgba(138,3,3,0.8)] flex items-center gap-4">
        <Skull size={64} className="animate-pulse-slow" /> LEXICON
      </h1>
      
      <div className="w-full max-w-md bg-slate-900/80 p-6 border border-slate-800 space-y-4 text-left">
          <label className="text-xs text-spectral uppercase tracking-widest flex items-center gap-2"><Settings size={12}/> Select Protocol</label>
          <div className="grid grid-cols-2 gap-2">
            <select 
                className="bg-slate-950 border border-slate-700 text-xs p-2 outline-none text-slate-300"
                value={gameState.settings.difficulty}
                onChange={(e) => setGameState(prev => ({...prev, settings: {...prev.settings, difficulty: e.target.value as CEFRLevel}}))}
            >
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
            <select 
                className="bg-slate-950 border border-slate-700 text-xs p-2 outline-none text-slate-300"
                value={selectedExam || ''}
                onChange={(e) => setSelectedExam(e.target.value ? e.target.value as ExamType : null)}
            >
                <option value="">General English</option>
                {(['SAT', 'IELTS', 'TOEFL', 'GRE', 'GMAT', 'CET4', 'CET6'] as ExamType[]).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          
          <div className="flex gap-2">
              <button onClick={handleQuickStart} className="flex-1 py-3 bg-blood/20 text-blood border border-blood font-bold hover:bg-blood hover:text-white transition uppercase text-xs flex items-center justify-center gap-2">
                  <Zap size={14}/> Begin Simulation
              </button>
              <label className="flex-1 py-3 bg-slate-800 text-slate-400 border border-slate-700 font-bold hover:bg-slate-700 hover:text-white transition uppercase text-xs flex items-center justify-center cursor-pointer gap-2">
                  <FileText size={14}/> Load File <input type="file" onChange={(e) => {}} className="hidden" />
              </label>
          </div>
          <button onClick={() => setShowCamera(true)} className="w-full py-2 bg-slate-950 border border-slate-800 text-slate-500 hover:text-spectral text-xs uppercase flex items-center justify-center gap-2">
              <ImageIcon size={14}/> Activate Real World Protocol
          </button>
      </div>

      {renderChapters()}

      {/* Auth Widget (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50">
          <div className="flex flex-col items-end gap-2">
              {gameState.user ? (
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded">
                      <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Agent ID</span>
                          <span className="text-xs font-bold text-spectral">{gameState.user.username}</span>
                      </div>
                      <PersonIcon className="w-8 h-8 p-1 bg-slate-800 rounded-full text-slate-400" />
                  </div>
              ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-4 py-2 hover:border-spectral text-slate-400 hover:text-white transition-all uppercase text-xs tracking-widest"
                  >
                      <Lock size={12} /> System Access
                  </button>
              )}
          </div>
      </div>
    </div>
  );

  return (
    <Layout shake={currentSegment?.visualCue === 'shake'} settings={gameState.settings} backgroundImage={currentSegment?.imageUrl}>
      {loading && <GhostOverlay onEliminate={handleGhostEliminate} onDamage={handleGhostDamage} />}
      
      {showCamera && <RealWorldCamera onCapture={(img) => { setShowCamera(false); handleImageClick(img as any); }} onClose={() => setShowCamera(false)} onLocationFound={setCoords}/>}

      {gameState.mode !== GameMode.INTRO && (
          <div className="absolute top-4 right-4 z-30 flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 opacity-50 hover:opacity-100"><Settings /></button>
            <button onClick={handleLogout} className="p-2 opacity-50 hover:text-blood hover:opacity-100"><LogOut /></button>
          </div>
      )}

      {isSettingsOpen && <SettingsModal settings={gameState.settings} updateSettings={(s) => setGameState(prev => ({ ...prev, settings: s }))} onClose={() => setIsSettingsOpen(false)} />}
      
      {showAuthModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
              <div className="relative">
                  <button onClick={() => setShowAuthModal(false)} className="absolute -top-10 right-0 text-slate-500 hover:text-white uppercase text-xs">Close</button>
                  <AuthForm onLogin={handleLogin} />
              </div>
          </div>
      )}
      
      {gameState.mode === GameMode.DARKROOM && <Darkroom onBack={() => setGameState(prev => ({...prev, mode: GameMode.INTRO}))} />}
      {gameState.mode === GameMode.INTRO && renderIntro()}
      {gameState.mode === GameMode.GAMEPLAY && renderGameplay()}
      {gameState.mode === GameMode.GAMEOVER && <div className="text-center mt-20 text-blood font-horror text-4xl">DECEASED <button onClick={()=>window.location.reload()} className="block mx-auto mt-4 text-sm font-sans border p-2">Restart</button></div>}
    </Layout>
  );
};

export default App;