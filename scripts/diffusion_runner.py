#!/usr/bin/env python3
"""Executes Stable Diffusion pipelines and returns PNG images encoded as base64 strings.

The script expects a JSON payload on stdin with the shape:
{
  "mode": "txt2img" | "img2img",
  "model_id": "stabilityai/stable-diffusion-xl-base-1.0",
  "prompt": "...",
  "width": 1024,
  "height": 1024,
  "guidance_scale": 7.5,
  "num_inference_steps": 30,
  "precision": "auto" | "fp16" | "bf16" | "fp32",
  "device": "auto" | "cuda" | "cpu" | "mps",
  "output_format": "png",
  "scheduler": "DDIM",
  "strength": 0.6,
  "init_images": ["<base64>"]
}

It prints a JSON document to stdout with either:
- {"success": true, "images": ["<base64>", ...], "diagnostics": {...}}
- {"success": false, "error": "message", "errorType": "vram"|"runtime"|"validation", "diagnostics": {...}}
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys
import traceback
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import torch
from diffusers import (
    DDIMScheduler,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler,
    EulerDiscreteScheduler,
    LCMScheduler,
    StableDiffusionImg2ImgPipeline,
    StableDiffusionPipeline,
)
from PIL import Image

PIPELINE_CACHE: Dict[Tuple[str, str, str], Any] = {}

DEFAULT_TEXT_MODEL = os.environ.get("SD_MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
DEFAULT_IMG2IMG_MODEL = os.environ.get("SD_IMG2IMG_MODEL_ID", DEFAULT_TEXT_MODEL)
DEFAULT_PRECISION = os.environ.get("SD_PRECISION", "auto")
DEFAULT_DEVICE = os.environ.get("SD_DEVICE", "auto")
DEFAULT_SCHEDULER = os.environ.get("SD_SCHEDULER")
DEFAULT_LCM_ADAPTER_ID = os.environ.get("SD_LCM_LORA_ID")

SCHEDULER_REGISTRY = {
    "ddim": DDIMScheduler,
    "dpmsolver": DPMSolverMultistepScheduler,
    "dpmsolver++": DPMSolverMultistepScheduler,
    "dpmsolver_multistep": DPMSolverMultistepScheduler,
    "euler": EulerDiscreteScheduler,
    "euler_ancestral": EulerAncestralDiscreteScheduler,
}

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


@dataclass
class DiffusionDiagnostics:
    device: Optional[str] = None
    model_id: Optional[str] = None
    precision: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    scheduler: Optional[str] = None
    steps: Optional[int] = None
    images: Optional[int] = None


@dataclass
class DiffusionResponse:
    success: bool
    images: Optional[List[str]] = None
    error: Optional[str] = None
    errorType: Optional[str] = None
    diagnostics: Optional[Dict[str, Any]] = None


class ValidationError(Exception):
    pass


def _log_debug(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _select_device(preferred: str) -> str:
    preferred = (preferred or "auto").lower()

    if preferred == "cuda" and torch.cuda.is_available():
        return "cuda"
    if preferred == "mps" and torch.backends.mps.is_available():
        return "mps"
    if preferred == "cpu":
        return "cpu"

    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _select_dtype(device: str, precision: str) -> torch.dtype:
    precision = (precision or "auto").lower()

    if precision == "auto":
        return torch.float16 if device in {"cuda", "mps"} else torch.float32

    if precision in {"fp16", "float16"}:
        return torch.float16 if device in {"cuda", "mps"} else torch.float32

    if precision in {"bf16", "bfloat16"} and hasattr(torch, "bfloat16"):
        return torch.bfloat16 if device == "cuda" else torch.float32

    return torch.float32


def _load_pipeline(mode: str, model_id: str, device: str, dtype: torch.dtype):
    cache_key = (mode, model_id, str(dtype))
    pipeline = PIPELINE_CACHE.get(cache_key)
    if pipeline is not None:
        return pipeline

    load_kwargs = {
        "use_safetensors": True,
    }

    if mode == "txt2img":
        pipeline = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=dtype, **load_kwargs)
    elif mode == "img2img":
        pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(model_id, torch_dtype=dtype, **load_kwargs)
    else:
        raise ValidationError(f"Unsupported mode '{mode}'.")

    if device == "cuda":
        pipeline = pipeline.to("cuda")
        pipeline.enable_attention_slicing()
        pipeline.enable_vae_tiling()
    elif device == "mps":
        pipeline = pipeline.to("mps")
    else:
        pipeline = pipeline.to("cpu")

    # Optional LCM-LoRA acceleration
    if DEFAULT_LCM_ADAPTER_ID:
        try:
            pipeline.scheduler = LCMScheduler.from_config(pipeline.scheduler.config)
            pipeline.load_lora_weights(DEFAULT_LCM_ADAPTER_ID)
            try:
                pipeline.fuse_lora()
            except Exception:
                pass
            _log_debug(f"LCM-LoRA enabled: {DEFAULT_LCM_ADAPTER_ID}")
        except Exception as exc:
            _log_debug(f"Failed to enable LCM-LoRA: {exc}")

    # Disable progress bars for speed
    try:
        pipeline.set_progress_bar_config(disable=True)
    except Exception:
        pass

    # Optional torch.compile for UNet (PyTorch 2+)
    if device == "cuda" and os.environ.get("TORCH_COMPILE", "0").lower() in {"1","true","yes"} and hasattr(torch, "compile"):
        try:
            pipeline.unet = torch.compile(pipeline.unet, mode="reduce-overhead")
            _log_debug("torch.compile enabled for UNet")
        except Exception as exc:
            _log_debug(f"torch.compile failed: {exc}")

    PIPELINE_CACHE[cache_key] = pipeline
    return pipeline


def _decode_base64_image(payload: str) -> Image.Image:
    try:
        data = base64.b64decode(payload)
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise ValidationError("Failed to decode base image. Ensure it is valid base64 PNG data.") from exc


def _encode_png(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _is_vram_error(error: BaseException) -> bool:
    message = str(error).lower()
    return any(
        fragment in message
        for fragment in (
            "cuda out of memory",
            "cublas",
            "cufft",
            "mps backend out of memory",
            "alloc failed",
        )
    )


def _prepare_generator(device: str, seed: Optional[int]) -> Optional[torch.Generator]:
    if seed is None:
        return None

    generator_device = device if device != "cpu" else "cpu"
    generator = torch.Generator(generator_device)
    generator.manual_seed(int(seed))
    return generator


def _resolve_scheduler(pipeline, scheduler_name: Optional[str]):
    if not scheduler_name:
        return

    key = scheduler_name.lower()
    scheduler_cls = SCHEDULER_REGISTRY.get(key)
    if not scheduler_cls:
        _log_debug(f"Unknown scheduler '{scheduler_name}', keeping default")
        return

    try:
        pipeline.scheduler = scheduler_cls.from_config(pipeline.scheduler.config)
    except Exception as exc:  # noqa: BLE001
        _log_debug(f"Failed to apply scheduler '{scheduler_name}': {exc}")


def _combine_images(images: List[Image.Image]) -> Image.Image:
    if len(images) == 1:
        return images[0]

    iterator = iter(images)
    base = next(iterator)
    for index, image in enumerate(iterator, start=2):
        base = Image.blend(base, image, 1 / index)
    return base


def _handle_request(payload: Dict[str, Any]) -> DiffusionResponse:
    mode = payload.get("mode", "txt2img")
    prompt = payload.get("prompt")
    model_id = payload.get("model_id") or (DEFAULT_IMG2IMG_MODEL if mode == "img2img" else DEFAULT_TEXT_MODEL)
    width = int(payload.get("width", 1024))
    height = int(payload.get("height", 1024))
    guidance_scale = float(payload.get("guidance_scale", 7.5))
    steps = int(payload.get("num_inference_steps", 30))
    # Adjust defaults for LCM-LoRA if enabled
    if DEFAULT_LCM_ADAPTER_ID:
        try:
            steps = min(steps, int(os.environ.get("SD_STEPS", "8")))
        except Exception:
            steps = min(steps, 8)
        try:
            guidance_scale = float(os.environ.get("SD_GUIDANCE", "1.0"))
        except Exception:
            guidance_scale = 1.0
    num_images = int(payload.get("num_images", 2))
    precision = payload.get("precision", DEFAULT_PRECISION)
    device_pref = payload.get("device", DEFAULT_DEVICE)
    scheduler_name = payload.get("scheduler", DEFAULT_SCHEDULER)
    seed = payload.get("seed")

    if not prompt:
        raise ValidationError("Prompt is required.")

    if width % 8 != 0 or height % 8 != 0:
        raise ValidationError("Width and height must be multiples of 8.")

    device = _select_device(device_pref)
    dtype = _select_dtype(device, precision)

    pipeline = _load_pipeline(mode, model_id, device, dtype)
    _resolve_scheduler(pipeline, scheduler_name)

    generator = _prepare_generator(device, seed)

    diagnostics = DiffusionDiagnostics(
        device=device,
        model_id=model_id,
        precision=str(dtype).replace('torch.', ''),
        width=width,
        height=height,
        scheduler=scheduler_name,
        steps=steps,
        images=num_images,
    )

    try:
        if mode == "txt2img":
            result = pipeline(
                prompt=prompt,
                width=width,
                height=height,
                guidance_scale=guidance_scale,
                num_inference_steps=steps,
                generator=generator,
                negative_prompt=payload.get("negative_prompt"),
                num_images_per_prompt=num_images,
            )
        else:
            init_images_payload = payload.get("init_images")
            if not init_images_payload:
                raise ValidationError("Image-to-image mode requires at least one base image.")
            init_images = [_decode_base64_image(item) for item in init_images_payload]
            strength = float(payload.get("strength", 0.6))
            base_image = _combine_images(init_images)
            result = pipeline(
                prompt=prompt,
                image=base_image,
                strength=strength,
                guidance_scale=guidance_scale,
                num_inference_steps=steps,
                generator=generator,
                negative_prompt=payload.get("negative_prompt"),
                num_images_per_prompt=num_images,
            )

        images = [_encode_png(image) for image in result.images]
        return DiffusionResponse(success=True, images=images, diagnostics=diagnostics.__dict__)
    except Exception as exc:  # noqa: BLE001
        error_type = "vram" if _is_vram_error(exc) else "runtime"
        diagnostics_dict = dict(diagnostics.__dict__)
        diagnostics_dict["trace"] = traceback.format_exc()
        return DiffusionResponse(success=False, error=str(exc), errorType=error_type, diagnostics=diagnostics_dict)


def main() -> None:
    try:
        raw_payload = sys.stdin.read()
        if not raw_payload.strip():
            raise ValidationError("No payload received from caller.")
        payload = json.loads(raw_payload)
        response = _handle_request(payload)
    except ValidationError as exc:
        response = DiffusionResponse(success=False, error=str(exc), errorType="validation")
    except json.JSONDecodeError as exc:
        response = DiffusionResponse(success=False, error=f"Invalid JSON payload: {exc}", errorType="validation")
    except Exception as exc:  # noqa: BLE001
        response = DiffusionResponse(success=False, error=str(exc), errorType="runtime")
        traceback.print_exc(file=sys.stderr)

    sys.stdout.write(json.dumps(response.__dict__))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
