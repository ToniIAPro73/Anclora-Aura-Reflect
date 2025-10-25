import { z } from "zod";

const SUPPORTED_ASPECT_RATIOS = ["Auto", "1:1", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4"];

export const generateRequestSchema = z
  .object({
    prompt: z
      .string({ required_error: "prompt is required" })
      .trim()
      .min(1, "prompt must not be empty")
      .max(500, "prompt must be at most 500 characters"),
    aspectRatio: z
      .string()
      .trim()
      .optional()
      .default("Auto")
      .refine((value) => SUPPORTED_ASPECT_RATIOS.includes(value), {
        message: `aspectRatio must be one of: ${SUPPORTED_ASPECT_RATIOS.join(", ")}`,
      }),
    temperature: z
      .coerce.number({ invalid_type_error: "temperature must be a number" })
      .min(0, "temperature must be at least 0")
      .max(2, "temperature must be at most 2")
      .optional()
      .default(0.8),
  })
  .transform((value) => ({
    ...value,
    aspectRatio: value.aspectRatio ?? "Auto",
    temperature: value.temperature ?? 0.8,
  }));

export const refineRequestSchema = z.object({
  images: z
    .array(z.string().trim())
    .nonempty("images must contain at least one image")
    .refine((values) => values.every((value) => value.startsWith("data:image")), {
      message: "images must be data URLs",
    }),
  prompt: z
    .string({ required_error: "prompt is required" })
    .trim()
    .min(1, "prompt must not be empty")
    .max(500, "prompt must be at most 500 characters"),
});

export const aspectRatioMap = SUPPORTED_ASPECT_RATIOS;
