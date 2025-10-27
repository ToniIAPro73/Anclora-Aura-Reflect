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

export const isCloudConfigured = (): boolean => {
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

let CLOUD_GPU_AVAILABLE: boolean | null = null;
let CLOUD_HEALTH_LAST_CHECK = 0;

const isCloudGpuAvailable = async (): Promise<boolean> => {
  if (!isCloudConfigured()) return false;
  const now = Date.now();
  // Re-check health every 60 seconds
  if (CLOUD_GPU_AVAILABLE !== null && now - CLOUD_HEALTH_LAST_CHECK < 60_000) {
    return CLOUD_GPU_AVAILABLE;
  }
  const health = await getHealth();
  CLOUD_HEALTH_LAST_CHECK = now;
  if (health.ok) {
    const device = String(health.data?.device || "").toLowerCase();
    CLOUD_GPU_AVAILABLE = device.includes("cuda") || device.includes("mps");
  } else {
    CLOUD_GPU_AVAILABLE = false;
  }
  return CLOUD_GPU_AVAILABLE!;
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

  const gpu = await isCloudGpuAvailable();
  const payload = {
    prompt,
    aspectRatio,
    temperature,
    resolution: gpu ? "high" : "standard",
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

export const getHealth = async (timeoutMs = 1500): Promise<{ ok: boolean; data?: any; error?: string }> => {
  if (!isCloudConfigured()) {
    return { ok: false, error: "Cloud engine URL not configured" };
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${CLOUD_ENGINE_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(id));
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error: any) {
    const msg = error?.name === "AbortError" ? "timeout" : (error?.message ?? String(error));
    return { ok: false, error: msg };
  }
};