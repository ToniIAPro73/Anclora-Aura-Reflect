import { HfInference } from "@huggingface/inference";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { bufferToDataUrl, parseDataUrl } from "../utils/image.js";
import { ModelInvocationError, UpstreamUnavailableError } from "../errors.js";

const inference = new HfInference(config.hfToken ?? undefined);

const ASPECT_RATIO_DIMENSIONS = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1152, height: 648 },
  "9:16": { width: 648, height: 1152 },
  "3:2": { width: 1152, height: 768 },
  "2:3": { width: 768, height: 1152 },
  "4:5": { width: 1024, height: 1280 },
  "5:4": { width: 1280, height: 1024 },
};

const temperatureToGuidanceScale = (temperature) => {
  const minScale = 1;
  const maxScale = 20;
  const normalized = Math.min(Math.max(temperature, 0), 2) / 2;
  return minScale + normalized * (maxScale - minScale);
};

const handleInferenceError = (error) => {
  if (error instanceof ModelInvocationError || error instanceof UpstreamUnavailableError) {
    throw error;
  }

  if (error?.status === 503) {
    throw new UpstreamUnavailableError("The image generation service is temporarily unavailable");
  }

  logger.error({ err: error }, "Pipeline invocation failed");
  throw new ModelInvocationError("Failed to generate images", error?.message ?? String(error));
};

export const runTextToImage = async ({ prompt, aspectRatio, temperature }) => {
  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] ?? undefined;
  const guidanceScale = temperatureToGuidanceScale(temperature ?? 0.8);

  try {
    const startedAt = Date.now();
    const results = await Promise.all(
      Array.from({ length: 2 }, async (_, index) => {
        logger.debug({ prompt, aspectRatio, index }, "Invoking text-to-image pipeline");
        const blob = await inference.textToImage({
          model: config.textToImageModel,
          inputs: prompt,
          parameters: {
            guidance_scale: guidanceScale,
            ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
          },
        });
        const arrayBuffer = await blob.arrayBuffer();
        return bufferToDataUrl(Buffer.from(arrayBuffer));
      })
    );
    const durationMs = Date.now() - startedAt;
    return { images: results, meta: { model: config.textToImageModel, durationMs } };
  } catch (error) {
    handleInferenceError(error);
  }
};

export const runImageToImage = async ({ images, prompt }) => {
  try {
    const startedAt = Date.now();
    const results = await Promise.all(
      images.map(async (dataUrl, index) => {
        let parsed;
        try {
          parsed = parseDataUrl(dataUrl);
        } catch (error) {
          throw new ModelInvocationError(`Image at index ${index} is not a valid data URL`, error.message);
        }

        logger.debug({ prompt, index }, "Invoking image-to-image pipeline");
        const blob = await inference.imageToImage({
          model: config.imageToImageModel,
          inputs: prompt,
          image: parsed.buffer,
          parameters: {
            strength: config.imageToImageStrength,
          },
        });
        const arrayBuffer = await blob.arrayBuffer();
        return bufferToDataUrl(Buffer.from(arrayBuffer));
      })
    );
    const durationMs = Date.now() - startedAt;
    return { images: results, meta: { model: config.imageToImageModel, strength: config.imageToImageStrength, durationMs } };
  } catch (error) {
    handleInferenceError(error);
  }
};
