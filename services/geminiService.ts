import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
}

export const generateInitialImages = async (prompt: string, aspectRatio: string, temperature: number): Promise<string[]> => {
  try {
    const apiConfig: {
      outputMimeType: string;
      aspectRatio?: string;
      temperature: number;
    } = {
      outputMimeType: 'image/png',
      temperature: temperature,
    };

    if (aspectRatio !== 'Auto') {
      apiConfig.aspectRatio = aspectRatio;
    }

    const commonConfig = {
      model: 'imagen-4.0-generate-001',
      prompt: `An evocative, high-quality image representing the mood of: ${prompt}. No text, no typography.`,
    };

    // To avoid rate limit errors, we make a single request for 2 images.
    const response = await ai.models.generateImages({
        ...commonConfig,
        config: { ...apiConfig, numberOfImages: 2 },
    });
    
    const allImages = response.generatedImages ? response.generatedImages.map(img => img.image.imageBytes) : [];

    if (allImages.length === 0) {
        throw new Error("API returned no images.");
    }

    return allImages;
  } catch (error) {
    console.error("Error generating initial images:", error);
    throw error;
  }
};

export const refineImages = async (baseImages: string[], refinePrompt: string): Promise<string[]> => {
    try {
        const imageParts = baseImages.map(baseImage => {
            const base64ImageData = dataUrlToBase64(baseImage);
            return {
                inlineData: {
                  data: base64ImageData,
                  mimeType: 'image/png',
                },
            };
        });
    
        const textPart = {
            text: `Based on the provided images, generate a new image that incorporates this theme: ${refinePrompt}. The new image should be inspired by the original images, combining their styles, but not be an identical edit.`,
        };
        
        const refinedImages: string[] = [];
        // Generate 2 images sequentially to be consistent and avoid rate limiting.
        for (let i = 0; i < 2; i++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part && part.inlineData) {
                refinedImages.push(part.inlineData.data);
            } else {
                 throw new Error("Invalid response structure from refine API call.");
            }
        }

        return refinedImages;

    } catch (error) {
        console.error("Error refining images:", error);
        throw error;
    }
};