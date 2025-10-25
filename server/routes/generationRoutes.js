import { Router } from "express";
import { generateHandler, refineHandler } from "../controllers/generationController.js";

export const generationRouter = Router();

generationRouter.post("/generate", generateHandler);
generationRouter.post("/refine", refineHandler);
