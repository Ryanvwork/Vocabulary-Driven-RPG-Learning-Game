export enum GameMode {
  AUTH = 'AUTH',
  INTRO = 'INTRO',
  INGESTION = 'INGESTION',
  GAMEPLAY = 'GAMEPLAY',
  REVIEW_DUNGEON = 'REVIEW_DUNGEON',
  DARKROOM = 'DARKROOM', // Image editing
  GAMEOVER = 'GAMEOVER',
  WIN = 'WIN'
}

export enum Genre {
  COSMIC = 'Cosmic Horror',
  SLASHER = 'Slasher / Pursuit',
  RULE_BASED = 'Rule-Based (SCP Style)',
  PSYCHOLOGICAL = 'Psychological'
}

export interface User {
  id: string;
  username: string;
  email: string;
  isGuest?: boolean;
}

export interface VocabularyWord {
  word: string;
  definition: string;
  example: string;
  mastered: boolean;
  seenCount: number;
}

export interface Buff {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  duration: number; // Turns remaining
  effectDescription: string;
  healthChangePerTurn?: number;
  sanityChangePerTurn?: number;
}

export interface Entity {
  name: string;
  distance: 'near' | 'far' | 'lurking';
  status: 'hostile' | 'neutral' | 'unknown' | 'hidden_truth';
  description: string;
}

export type BodyPartType = 'head' | 'torso' | 'arms' | 'legs';

export interface BodyStatus {
  head: number; // 0-100
  torso: number;
  arms: number;
  legs: number;
  criticalTurnsRemaining?: number; // If head/torso injured, countdown to death
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc' | 'key';
  description: string;
  effectValue?: number;
}

export interface Choice {
  id: string;
  text: string;
  sanityImpact: number; 
  outcomePreview: string; 
  addedBuff?: Buff;
  damageTarget?: BodyPartType; // Which body part this choice risks
  damageAmount?: number;
}

export interface StorySegment {
  narrative: string;
  highlightedWords: string[];
  newVocabDefinitions?: VocabularyWord[];
  choices: Choice[];
  visualCue: 'normal' | 'shake' | 'glitch' | 'fade';
  backgroundAmbience: string;
  imageUrl?: string;
  nearbyEntities: Entity[];
  newItems?: Item[];
}

export interface ReviewEncounter {
  enemyName: string;
  description: string;
  targetWord: string;
  options: string[];
}

export interface Chapter {
  id: string;
  title: string;
  fullText: string;
  date: number;
  usedVocab: string[]; // To reduce frequency in future
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type FontFamily = 'mono' | 'sans' | 'serif' | 'horror';
export type ExamType = 'SAT' | 'IELTS' | 'TOEFL' | 'GRE' | 'GMAT' | 'CET4' | 'CET6';

export interface GameSettings {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  language: 'en' | 'es' | 'fr' | 'de' | 'jp';
  difficulty: CEFRLevel;
  fontFamily: FontFamily;
  customColors: {
    background: string;
    text: string;
  };
  enableImageGeneration: boolean;
}

export interface GameState {
  user: User | null;
  mode: GameMode;
  body: BodyStatus; // Specific body parts instead of generic health
  maxHealth: number;
  sanity: number;
  maxSanity: number;
  inventory: Item[];
  equipped: {
    weapon: Item | null;
    armor: Item | null;
  };
  buffs: Buff[];
  artifacts: string[];
  vocabulary: VocabularyWord[];
  grimoireOpen: boolean;
  history: string[];
  chapters: Chapter[]; // Archives
  settings: GameSettings;
  genre: Genre;
  customTextContext: string;
  examFocus?: ExamType;
}