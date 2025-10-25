import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(3000),
  HF_API_TOKEN: z.string().min(1, "HF_API_TOKEN is required").optional(),
  TEXT2IMG_MODEL: z.string().min(1).optional(),
  IMG2IMG_MODEL: z.string().min(1).optional(),
  IMG2IMG_STRENGTH: z
    .string()
    .transform((value) => parseFloat(value))
    .refine((value) => !Number.isNaN(value), {
      message: "IMG2IMG_STRENGTH must be a number",
    })
    .optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  BODY_LIMIT_MB: z
    .string()
    .transform((value) => parseInt(value, 10))
    .refine((value) => !Number.isNaN(value) && value > 0, {
      message: "BODY_LIMIT_MB must be a positive integer",
    })
    .optional(),
});

const rawConfig = configSchema.parse(process.env);

const parseOrigins = (origins) => {
  if (!origins) {
    return [];
  }

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const config = {
  port: rawConfig.PORT,
  hfToken: rawConfig.HF_API_TOKEN ?? null,
  textToImageModel: rawConfig.TEXT2IMG_MODEL ?? "stabilityai/stable-diffusion-2-1",
  imageToImageModel: rawConfig.IMG2IMG_MODEL ?? rawConfig.TEXT2IMG_MODEL ?? "stabilityai/stable-diffusion-2-1",
  imageToImageStrength: rawConfig.IMG2IMG_STRENGTH ?? 0.6,
  allowedOrigins: parseOrigins(rawConfig.ALLOWED_ORIGINS),
  bodyLimit: `${rawConfig.BODY_LIMIT_MB ?? 15}mb`,
};
