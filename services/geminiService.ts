const DEFAULT_BACKEND_URL = "http://localhost:3001";

const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_IMAGE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
  const url = envUrl && envUrl.trim().length > 0 ? envUrl : DEFAULT_BACKEND_URL;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const ensureDataUri = (image: string): string => {
  if (image.startsWith("data:image")) {
    return image;
  }

  return `data:image/png;base64,${image}`;
};

const handleResponse = async (response: Response): Promise<string[]> => {
  const contentType = response.headers.get("content-type") || "";

  const parseErrorPayload = async () => {
    if (contentType.includes("application/json")) {
      try {
        const json = await response.clone().json();
        return JSON.stringify(json);
      } catch (_) {
        return "<unparseable json error payload>";
      }
    }

    try {
      return await response.clone().text();
    } catch (_) {
      return "<unparseable error payload>";
    }
  };

  if (!response.ok) {
    const errorPayload = await parseErrorPayload();
    throw new Error(`Backend request failed with status ${response.status}: ${errorPayload}`);
  }

  let body: unknown;
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    throw new Error("Unexpected response type from backend; expected JSON body.");
  }

  const images = (body as { images?: unknown }).images;

  if (!Array.isArray(images)) {
    throw new Error("Backend response missing 'images' array.");
  }

  return images.map((image) => {
    if (typeof image !== "string") {
      throw new Error("Backend response contained a non-string image entry.");
    }
    return ensureDataUri(image);
  });
};

const postJson = async (path: string, payload: unknown): Promise<string[]> => {
  const url = `${getBackendUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

export const generateInitialImages = async (
  prompt: string,
  aspectRatio: string,
  temperature: number,
): Promise<string[]> => {
  try {
    return await postJson("/generate", { prompt, aspectRatio, temperature });
  } catch (error) {
    console.error("Error generating initial images:", error);
    throw error;
  }
};

export const refineImages = async (
  baseImages: string[],
  refinePrompt: string,
): Promise<string[]> => {
  try {
    return await postJson("/refine", { baseImages, refinePrompt });
  } catch (error) {
    console.error("Error refining images:", error);
    throw error;
  }
};
