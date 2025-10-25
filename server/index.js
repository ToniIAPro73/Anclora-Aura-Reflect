import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { generationRouter } from "./routes/generationRoutes.js";
import { logger } from "./logger.js";
import { HttpError } from "./errors.js";

if (!config.hfToken) {
  logger.warn("HF_API_TOKEN is not set. Requests to Hugging Face may be rate limited or rejected.");
}

const app = express();

app.disable("x-powered-by");

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    maxAge: 600,
  })
);

app.use(express.json({ limit: config.bodyLimit }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", models: { text2img: config.textToImageModel, img2img: config.imageToImageModel } });
});

app.use("/api", generationRouter);

app.use((req, res, next) => {
  const error = new HttpError(404, "NOT_FOUND", "Route not found");
  next(error);
});

app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    logger.warn({ origin: req.headers.origin }, "Blocked request due to CORS policy");
    res.status(403).json({ error: { code: "CORS_NOT_ALLOWED", message: "Origin not allowed" } });
    return;
  }

  const status = err.status ?? 500;
  const payload = {
    error: {
      code: err.code ?? "INTERNAL_SERVER_ERROR",
      message: status >= 500 ? "Unexpected server error" : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };

  if (status >= 500) {
    logger.error({ err }, "Unhandled error");
  } else {
    logger.warn({ err }, "Request failed");
  }

  res.status(status).json(payload);
});

app.listen(config.port, () => {
  logger.info({ port: config.port }, "Image generation service listening");
});
