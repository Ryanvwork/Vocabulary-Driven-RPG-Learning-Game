import { GoogleGenAI, Schema, Type } from "@google/genai";
import { StorySegment, VocabularyWord, Genre, ReviewEncounter, CEFRLevel, ExamType, BodyStatus, Chapter, Item } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          definition: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: ["word", "definition", "example"],
      },
    },
  },
  required: ["words"],
};

const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: "The story paragraph. Use vivid, horror descriptions." },
    highlightedWords: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
    },
    newVocabDefinitions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            word: { type: Type.STRING },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            mastered: { type: Type.BOOLEAN },
            seenCount: { type: Type.NUMBER }
        }
      }
    },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          sanityImpact: { type: Type.NUMBER, description: "Effect on Mental Energy (-20 to +10)." },
          damageTarget: { type: Type.STRING, enum: ['head', 'torso', 'arms', 'legs'], description: "Which body part is risked/damaged." },
          damageAmount: { type: Type.NUMBER, description: "Damage amount (0-100). 0 if safe." },
          outcomePreview: { type: Type.STRING, description: "A subtle hint about the consequence." },
          addedBuff: {
              type: Type.OBJECT,
              properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['buff', 'debuff'] },
                  duration: { type: Type.NUMBER },
                  effectDescription: { type: Type.STRING },
                  healthChangePerTurn: { type: Type.NUMBER },
                  sanityChangePerTurn: { type: Type.NUMBER }
              },
              nullable: true
          }
        },
        required: ["id", "text", "sanityImpact", "outcomePreview"],
      },
    },
    visualCue: { 
        type: Type.STRING, 
        enum: ["normal", "shake", "glitch", "fade"] 
    },
    backgroundAmbience: { type: Type.STRING },
    nearbyEntities: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                distance: { type: Type.STRING, enum: ['near', 'far', 'lurking'] },
                status: { type: Type.STRING, enum: ['hostile', 'neutral', 'unknown', 'hidden_truth'] },
                description: { type: Type.STRING }
            },
            required: ['name', 'distance', 'status', 'description']
        }
    },
    newItems: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['weapon', 'armor', 'consumable', 'misc', 'key'] },
                description: { type: Type.STRING },
                effectValue: { type: Type.NUMBER }
            },
            required: ['id', 'name', 'type', 'description']
        }
    }
  },
  required: ["narrative", "choices", "visualCue", "highlightedWords", "nearbyEntities"],
};

const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    enemyName: { type: Type.STRING },
    description: { type: Type.STRING },
    targetWord: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["enemyName", "description", "targetWord", "options"]
};

const craftingSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        success: { type: Type.BOOLEAN },
        message: { type: Type.STRING },
        createdItem: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['weapon', 'armor', 'consumable', 'misc', 'key'] },
                description: { type: Type.STRING },
                effectValue: { type: Type.NUMBER }
            },
            nullable: true
        },
        consumedItemIds: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
        }
    },
    required: ["success", "message", "consumedItemIds"]
};

export const extractVocabularyFromText = async (text: string): Promise<VocabularyWord[]> => {
  const prompt = `
    Analyze the following text and extract 10-15 challenging, advanced, or domain-specific vocabulary words.
    Text Preview: ${text.slice(0, 3000)}...
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: extractionSchema },
    });
    const parsed = JSON.parse(response.text || "{}");
    return parsed.words?.map((w: any) => ({ ...w, mastered: false, seenCount: 0 })) || [];
  } catch (error) {
    return [];
  }
};

export const generateVocabularyFromSettings = async (difficulty: CEFRLevel, exam?: ExamType): Promise<VocabularyWord[]> => {
  const focusContext = exam ? `${exam} Exam Preparation` : `CEFR Level ${difficulty}`;
  const prompt = `Generate 15 high-quality, challenging vocabulary words specifically for: ${focusContext}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: extractionSchema },
    });
    const parsed = JSON.parse(response.text || "{}");
    return parsed.words?.map((w: any) => ({ ...w, mastered: false, seenCount: 0 })) || [];
  } catch (error) {
    return [];
  }
};

export const generateStorySegment = async (
  history: string[],
  availableVocab: VocabularyWord[],
  genre: Genre,
  sanity: number,
  bodyStatus: BodyStatus,
  difficulty: CEFRLevel,
  chapters: Chapter[],
  examFocus?: ExamType
): Promise<StorySegment> => {
  
  // Filter vocab: Exclude words that appear in saved chapters AND prioritize low seenCount
  const archivedWords = new Set(chapters.flatMap(c => c.usedVocab));
  
  const targetWords = availableVocab
    .filter(w => !archivedWords.has(w.word)) // Strong preference to avoid archived words
    .sort((a, b) => {
        if (a.seenCount !== b.seenCount) return a.seenCount - b.seenCount;
        return 0.5 - Math.random();
    })
    .slice(0, 3);
  
  // If we run out of fresh words, fallback to all available
  const finalTargetWords = targetWords.length > 0 ? targetWords : availableVocab.slice(0, 3);

  const targetWordList = finalTargetWords.map(w => w.word).join(", ");
  const examContext = examFocus ? `(Focus: ${examFocus})` : '';

  const systemInstruction = `
    You are the Game Master of a ${genre} survival horror game.
    
    Player Status:
    - Sanity: ${sanity}/100
    - Body: Head(${bodyStatus.head}%), Torso(${bodyStatus.torso}%), Arms(${bodyStatus.arms}%), Legs(${bodyStatus.legs}%)
    - Reading Level: ${difficulty} ${examContext}
    
    INJURY MECHANICS (CRITICAL):
    1. Arms < 10%: GRIPPING IMPOSSIBLE. Do not offer options requiring fine motor skills or heavy lifting.
    2. Legs < 10%: CRAWLING ONLY. Do not offer options to run or jump. Speed is drastically reduced.
    3. Head/Torso < 30%: MORTAL WOUND. The player is dying. Narrative should reflect fading consciousness.
    
    SANITY MECHANICS (CRITICAL):
    - High Sanity (>80): Player sees reality clearly.
    - Low Sanity (<50): The veil thins. You may reveal "Hidden Truths" or useful spectral items in 'nearbyEntities' (status: 'hidden_truth') that are invisible otherwise. 
    - Critical Sanity (<20): Hallucinations indistinguishable from reality.
    
    Guidelines:
    1. Narrative: Continue the story. Tone: Dark, Tense.
    2. Vocabulary: Naturally weave in: ${targetWordList}.
    3. Choices: Provide 2-3 choices. 
       - Must specify 'damageTarget' (head, torso, arms, legs) and 'damageAmount' if the choice is risky.
       - If Head/Torso damaged, use high risk.
    4. Perception: Populate 'nearbyEntities'. If Sanity is low, reveal useful secrets.
    5. Loot: Occasionally provide items in 'newItems'.
  `;

  const userContent = history.length > 0 
    ? `Previous events: ${history.slice(-3).join("\n")}. What happens next?`
    : `Start the story. The protagonist awakens in a strange location.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userContent,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const segment = JSON.parse(response.text || "{}") as StorySegment;
    // Safety checks
    if (!segment.highlightedWords) segment.highlightedWords = [];
    if (!segment.choices) segment.choices = [];
    if (!segment.nearbyEntities) segment.nearbyEntities = [];
    return segment;

  } catch (error) {
    console.error(error);
    return {
      narrative: "The simulation destabilizes...",
      highlightedWords: [],
      choices: [{ id: "retry", text: "Focus...", sanityImpact: 0, outcomePreview: "Retry", damageTarget: 'head', damageAmount: 0 }],
      visualCue: "glitch",
      backgroundAmbience: "Static",
      nearbyEntities: []
    };
  }
};

export const generateSceneImage = async (ambience: string, genre: Genre): Promise<string | null> => {
  const prompt = `A ${genre} horror style scene: ${ambience}. Dark, cinematic, high contrast, atmospheric. No text.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateRealWorldStart = async (
  base64Image: string,
  coords: { lat: number; lng: number } | null,
  difficulty: CEFRLevel
): Promise<StorySegment> => {
  const systemInstruction = `
    Game Master for "Real World Protocol".
    Analyze the image location. Create a horror scenario based on it.
    Vocab Level: ${difficulty}.
    Include Sanity impacts and perceive entities.
  `;
  const userPrompt = coords 
    ? `Coords: ${coords.lat}, ${coords.lng}. Analyze image.`
    : `Analyze image only.`;
  
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [{ inlineData: { mimeType: "image/jpeg", data: base64Data } }, { text: userPrompt }]
      },
      config: { systemInstruction, responseMimeType: "application/json", responseSchema: storySchema, thinkingConfig: { thinkingBudget: 0 } },
    });
    const segment = JSON.parse(response.text || "{}") as StorySegment;
    if (!segment.nearbyEntities) segment.nearbyEntities = [];
    return segment;
  } catch (error) {
    throw error;
  }
};

export const generateReviewEncounter = async (target: VocabularyWord, distractors: VocabularyWord[]): Promise<ReviewEncounter> => {
  const prompt = `Create a horror combat encounter for word: "${target.word}". Distractors: ${distractors.map(d=>d.word).join(", ")}.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: reviewSchema },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      enemyName: "The Void",
      description: `A shadow embodying: ${target.definition}`,
      targetWord: target.word,
      options: [target.word, ...distractors.slice(0,3).map(d => d.word)]
    };
  }
};

export const editImageArtifact = async (base64Image: string, prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: `Edit this image: ${prompt}. Horror style.` }
      ]
    }
  });
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return part.inlineData.data;
    }
  }
  throw new Error("No image generated");
};

export const attemptCrafting = async (ingredients: Item[], intent: string): Promise<{ success: boolean; message: string; createdItem?: Item; consumedItemIds: string[] }> => {
  const ingredientList = ingredients.map(i => `${i.name} (${i.description}) [ID: ${i.id}]`).join(', ');
  const prompt = `
    Player is attempting to craft with: ${ingredientList}.
    Intent: ${intent}.
    
    Determine if this combination creates a valid horror/survival item.
    If valid, create the item. If not, provide a failure message.
    Return which item IDs were consumed (removed from inventory) in the process (usually all ingredients if successful, or some if failed/damaged).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
          responseMimeType: "application/json", 
          responseSchema: craftingSchema,
          thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { success: false, message: "Crafting failed: " + error, consumedItemIds: [] };
  }
};