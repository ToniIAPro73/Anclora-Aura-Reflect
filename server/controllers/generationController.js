import { generateRequestSchema, refineRequestSchema } from "../validation/schemas.js";
import { runImageToImage, runTextToImage } from "../services/pipelineService.js";
import { ValidationError } from "../errors.js";

const parseRequest = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ValidationError(result.error.errors.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })));
  }
  return result.data;
};

export const generateHandler = async (req, res, next) => {
  try {
    const { prompt, aspectRatio, temperature } = parseRequest(generateRequestSchema, req.body ?? {});
    const result = await runTextToImage({ prompt, aspectRatio, temperature });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const refineHandler = async (req, res, next) => {
  try {
    const { images, prompt } = parseRequest(refineRequestSchema, req.body ?? {});
    const result = await runImageToImage({ images, prompt });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
