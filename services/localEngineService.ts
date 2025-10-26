import { LocalEngineConfig } from "../types";
import * as cloudEngine from "./cloudEngineService";

const LOCAL_ENGINE_BASE_URL = (
  import.meta.env.VITE_LOCAL_ENGINE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const CLOUD_ENGINE_BASE_URL = (
  import.meta.env.VITE_CLOUD_ENGINE_URL ?? ""
).replace(/\/$/, "");

const canUseCloudFallback = (): boolean => Boolean(CLOUD_ENGINE_BASE_URL);

export const getHealth = async (): Promise<{ ok: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(`${LOCAL_ENGINE_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? String(error) };
  }
};

const dataUrlToBase64 = (dataUrl: string): string => {
  const parts = dataUrl.split(",");
  return parts.length > 1 ? parts[1] : dataUrl;
};

const buildConfigPayload = (config: LocalEngineConfig): LocalEngineConfig => {
  const payload: LocalEngineConfig = {};

  if (config.modelPath?.trim()) {
    payload.modelPath = config.modelPath.trim();
  }

  if (typeof config.steps === "number" && !Number.isNaN(config.steps)) {
    payload.steps = config.steps;
  }

  if (
    typeof config.guidanceScale === "number" &&
    !Number.isNaN(config.guidanceScale)
  ) {
    payload.guidanceScale = config.guidanceScale;
  }

  return payload;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Local engine request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  if (!Array.isArray(data.images)) {
    throw new Error("Local engine response missing images array.");
  }

  return data.images as string[];
};

export const generateInitialImages = async (
  prompt: string,
  aspectRatio: string,
  temperature: number,
  config: LocalEngineConfig,
  options?: { disableFallback?: boolean }
): Promise<string[]> => {
  const payload = {
    prompt,
    aspectRatio,
    temperature,
  };

  try {
    const response = await fetch(`${LOCAL_ENGINE_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await handleResponse(response);
  } catch (error) {
    if (!options?.disableFallback && canUseCloudFallback()) {
      // Fallback to cloud engine
      return cloudEngine.generateInitialImages(prompt, aspectRatio, temperature, config);
    }
    throw error;
  }
};

export const refineImages = async (
  baseImages: string[],
  refinePrompt: string,
  config: LocalEngineConfig,
  options?: { disableFallback?: boolean }
): Promise<string[]> => {
  const payload = {
    refinePrompt,
    images: baseImages.map(dataUrlToBase64),
    config: buildConfigPayload(config),
  };

  try {
    const response = await fetch(`${LOCAL_ENGINE_BASE_URL}/refine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await handleResponse(response);
  } catch (error) {
    if (!options?.disableFallback && canUseCloudFallback()) {
      // Fallback to cloud engine
      return cloudEngine.refineImages(baseImages, refinePrompt, config);
    }
    throw error;
  }
};
