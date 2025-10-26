const API_BASE = "http://localhost:8000";

const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(",")[1];
};

export const generateInitialImages = async (
  prompt: string,
  aspectRatio: string,
  temperature: number
): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio, temperature }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.images;
  } catch (error) {
    console.error("Error generating initial images:", error);
    throw error;
  }
};

export const refineImages = async (
  baseImages: string[],
  refinePrompt: string
): Promise<string[]> => {
  try {
    const base64Images = baseImages.map(dataUrlToBase64);
    const response = await fetch(`${API_BASE}/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: base64Images, refinePrompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.images;
  } catch (error) {
    console.error("Error refining images:", error);
    throw error;
  }
};
