
import { GoogleGenAI } from "@google/genai";

export const generateWallpaper = async (userPrompt: string, stylePrompt: string): Promise<string> => {
  // Create a new GoogleGenAI instance right before the call to use the latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Enhance prompt for high quality wallpaper
  const fullPrompt = `Smartphone wallpaper, high resolution, 9:16 aspect ratio. Subject: ${userPrompt}. Style: ${stylePrompt}. Professional lighting, masterpiece, sharp focus, 8k.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: fullPrompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: "1K"
        }
      },
    });

    let imageUrl = '';
    // Find the image part in the response candidates
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("No image was generated.");
    }

    return imageUrl;
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    // Specifically handle auth errors to trigger key selection dialog in the UI
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("AUTH_ERROR");
    }
    throw error;
  }
};
