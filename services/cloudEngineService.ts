import { LocalEngineConfig } from "../types";

const CLOUD_ENGINE_BASE_URL = (
  import.meta.env.VITE_CLOUD_ENGINE_URL ?? ""
).replace(/\/$/, "");

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

const isCloudConfigured = (): boolean => {
  return Boolean(CLOUD_ENGINE_BASE_URL);
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Cloud engine request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  if (!Array.isArray(data.images)) {
    throw new Error("Cloud engine response missing images array.");
  }

  return data.images as string[];
};

export const generateInitialImages = async (
  prompt: string,
  aspectRatio: string,
  temperature: number,
  config: LocalEngineConfig
): Promise<string[]> => {
  if (!isCloudConfigured()) {
    throw new Error("Cloud engine URL is not configured.");
  }

  const payload = {
    prompt,
    aspectRatio,
    temperature,
    config: buildConfigPayload(config),
  };

  const response = await fetch(`${CLOUD_ENGINE_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

export const refineImages = async (
  baseImages: string[],
  refinePrompt: string,
  config: LocalEngineConfig
): Promise<string[]> => {
  if (!isCloudConfigured()) {
    throw new Error("Cloud engine URL is not configured.");
  }

  const payload = {
    refinePrompt,
    images: baseImages.map(dataUrlToBase64),
    config: buildConfigPayload(config),
  };

  const response = await fetch(`${CLOUD_ENGINE_BASE_URL}/refine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};