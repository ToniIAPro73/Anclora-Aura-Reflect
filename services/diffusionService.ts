import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  Auto: { width: 640, height: 640 },
  '1:1': { width: 640, height: 640 },
  '3:2': { width: 768, height: 512 },
  '2:3': { width: 512, height: 768 },
  '16:9': { width: 896, height: 512 },
  '9:16': { width: 512, height: 896 },
};

const DEFAULT_GUIDANCE = 6.5;
const DEFAULT_STEPS = 30;
const DEFAULT_IMG2IMG_STRENGTH = 0.6;
const PYTHON_MODULE_PATH = '../scripts/diffusion_runner.py';

const DEFAULT_TEXT_MODEL = process.env.SD_MODEL_ID ?? 'stabilityai/stable-diffusion-xl-base-1.0';
const DEFAULT_IMG2IMG_MODEL = process.env.SD_IMG2IMG_MODEL_ID ?? DEFAULT_TEXT_MODEL;
const DEFAULT_PRECISION = process.env.SD_PRECISION ?? 'auto';
const DEFAULT_DEVICE = process.env.SD_DEVICE ?? 'auto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DiffusionRunnerRequest {
  mode: 'txt2img' | 'img2img';
  model_id: string;
  prompt: string;
  width: number;
  height: number;
  guidance_scale: number;
  num_inference_steps: number;
  precision: string;
  device: string;
  output_format: 'png';
  num_images?: number;
  negative_prompt?: string;
  scheduler?: string;
  strength?: number;
  init_images?: string[];
  seed?: number;
}

interface DiffusionRunnerSuccess {
  success: true;
  images: string[];
  diagnostics?: DiffusionDiagnostics;
}

interface DiffusionRunnerFailure {
  success: false;
  error: string;
  errorType?: 'vram' | 'validation' | 'runtime';
  diagnostics?: DiffusionDiagnostics;
}

interface DiffusionDiagnostics {
  device?: string;
  model_id?: string;
  precision?: string;
  width?: number;
  height?: number;
  scheduler?: string;
  steps?: number;
  stderr?: string;
  exitCode?: number | null;
  images?: number;
  errorType?: string;
  runnerMessage?: string;
}

class DiffusionGenerationError extends Error {
  public diagnostics?: DiffusionDiagnostics;

  constructor(message: string, diagnostics?: DiffusionDiagnostics) {
    super(message);
    this.name = 'DiffusionGenerationError';
    this.diagnostics = diagnostics;
  }
}

const sanitizeDataUrl = (value: string): string => {
  const commaIndex = value.indexOf(',');
  const payload = commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  return payload.trim();
};

const resolveDimensions = (aspectRatio: string): { width: number; height: number } => {
  if (aspectRatio in ASPECT_RATIO_DIMENSIONS) {
    return ASPECT_RATIO_DIMENSIONS[aspectRatio];
  }

  return ASPECT_RATIO_DIMENSIONS.Auto;
};

const normalizeTemperature = (temperature: number): number => {
  if (!Number.isFinite(temperature)) {
    return DEFAULT_GUIDANCE;
  }

  const clamped = Math.min(Math.max(temperature, 0), 2);
  return Number((4.5 + clamped * 3).toFixed(2));
};

const ensureNodeRuntime = () => {
  if (typeof process === 'undefined' || process.release?.name !== 'node') {
    throw new Error('Stable diffusion generation is only supported in a Node.js runtime.');
  }
};

const runDiffusion = async (payload: DiffusionRunnerRequest): Promise<DiffusionRunnerSuccess> => {
  ensureNodeRuntime();

  const runnerPath = path.resolve(__dirname, PYTHON_MODULE_PATH);
  const pythonExecutable = process.env.DIFFUSION_PYTHON_PATH ?? process.env.PYTHON ?? 'python3';

  const { spawn } = await import('node:child_process');

  return new Promise((resolve, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(pythonExecutable, [runnerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      reject(new DiffusionGenerationError(`Failed to start diffusion runner: ${error.message}`, {
        stderr,
      }));
    });

    child.on('close', (code) => {
      const exitCode = typeof code === 'number' ? code : null;

      if (!stdout.trim()) {
        reject(new DiffusionGenerationError('Diffusion runner produced no output.', {
          stderr,
          exitCode,
        }));
        return;
      }

      let parsed: DiffusionRunnerSuccess | DiffusionRunnerFailure;

      try {
        parsed = JSON.parse(stdout) as DiffusionRunnerSuccess | DiffusionRunnerFailure;
      } catch (error) {
        reject(new DiffusionGenerationError(`Unable to parse diffusion runner output: ${(error as Error).message}`, {
          stderr: `${stderr}\n${stdout}`.trim(),
          exitCode,
        }));
        return;
      }

      if (parsed.success) {
        resolve({
          success: true,
          images: parsed.images,
          diagnostics: parsed.diagnostics,
        });
        return;
      }

      let message = parsed.error || 'Stable diffusion generation failed.';
      if (parsed.errorType === 'vram') {
        message = 'Stable diffusion generation failed due to insufficient GPU memory. Try lowering resolution or freeing VRAM.';
      } else if (parsed.errorType === 'validation') {
        message = `Invalid diffusion request: ${parsed.error}`;
      }
      const error = new DiffusionGenerationError(message, {
        ...parsed.diagnostics,
        stderr,
        exitCode,
        errorType: parsed.errorType,
        runnerMessage: parsed.error,
      });

      reject(error);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
};

export const generateInitialImages = async (
  prompt: string,
  aspectRatio: string,
  temperature: number,
): Promise<string[]> => {
  const { width, height } = resolveDimensions(aspectRatio);
  const guidance_scale = normalizeTemperature(temperature);

  const requestPayload: DiffusionRunnerRequest = {
    mode: 'txt2img',
    model_id: DEFAULT_TEXT_MODEL,
    prompt,
    width,
    height,
    guidance_scale,
    num_inference_steps: DEFAULT_STEPS,
    precision: DEFAULT_PRECISION,
    device: DEFAULT_DEVICE,
    output_format: 'png',
    num_images: 2,
    scheduler: process.env.SD_SCHEDULER,
  };

  const response = await runDiffusion(requestPayload);
  return response.images;
};

export const refineImages = async (
  baseImages: string[],
  refinePrompt: string,
): Promise<string[]> => {
  if (!Array.isArray(baseImages) || baseImages.length === 0) {
    throw new DiffusionGenerationError('At least one base image is required to run image-to-image refinement.');
  }

  const sanitized = baseImages.map(sanitizeDataUrl);

  const requestPayload: DiffusionRunnerRequest = {
    mode: 'img2img',
    model_id: DEFAULT_IMG2IMG_MODEL,
    prompt: refinePrompt,
    width: ASPECT_RATIO_DIMENSIONS.Auto.width,
    height: ASPECT_RATIO_DIMENSIONS.Auto.height,
    guidance_scale: DEFAULT_GUIDANCE,
    num_inference_steps: DEFAULT_STEPS,
    precision: DEFAULT_PRECISION,
    device: DEFAULT_DEVICE,
    output_format: 'png',
    num_images: 2,
    strength: DEFAULT_IMG2IMG_STRENGTH,
    scheduler: process.env.SD_SCHEDULER,
    init_images: sanitized,
  };

  const response = await runDiffusion(requestPayload);
  return response.images;
};

export { DiffusionGenerationError };
