"""Quick verification script for text-to-image and image-to-image pipelines."""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Type

import torch
from diffusers import (
    AutoPipelineForImage2Image,
    AutoPipelineForText2Image,
    DiffusionPipeline,
)
from PIL import Image

DEFAULT_MODEL_ID = "stabilityai/sdxl-turbo"
MODEL_ID = os.environ.get("DIFFUSERS_MODEL_ID", DEFAULT_MODEL_ID)
MODEL_OVERRIDE_PATH = os.environ.get("DIFFUSERS_MODEL_PATH")
OUTPUT_DIR = Path(__file__).resolve().parent / ".." / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _load_pipeline(pipeline_cls: Type[DiffusionPipeline]) -> DiffusionPipeline:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    target = MODEL_OVERRIDE_PATH or MODEL_ID

    load_kwargs = {
        "torch_dtype": dtype,
        "use_safetensors": True,
    }

    try:
        pipeline = pipeline_cls.from_pretrained(target, **load_kwargs)
    except OSError as exc:  # pragma: no cover - informative failure path
        hint = (
            "Unable to load model from '{target}'. Ensure the environment can "
            "reach the Hugging Face Hub or provide a local checkpoint via the "
            "DIFFUSERS_MODEL_PATH environment variable."
        ).format(target=target)
        raise RuntimeError(hint) from exc

    pipeline = pipeline.to(device)
    pipeline.set_progress_bar_config(disable=True)
    return pipeline


def run_text2img() -> float:
    pipeline = _load_pipeline(AutoPipelineForText2Image)

    start = time.perf_counter()
    with torch.inference_mode():
        image = pipeline(
            "A vibrant futuristic city skyline at sunset, digital art",
            num_inference_steps=4,
            guidance_scale=0.0,
        ).images[0]
    duration = time.perf_counter() - start

    output_path = OUTPUT_DIR / "text2img_sample.png"
    image.save(output_path)
    print(f"Saved text2img sample to {output_path}")
    return duration


def run_img2img() -> float:
    pipeline = _load_pipeline(AutoPipelineForImage2Image)

    init_image = Image.new("RGB", (512, 512), color="lightblue")

    start = time.perf_counter()
    with torch.inference_mode():
        image = pipeline(
            prompt="Transform into a dreamy watercolor landscape",
            image=init_image,
            strength=0.6,
            num_inference_steps=6,
            guidance_scale=0.5,
        ).images[0]
    duration = time.perf_counter() - start

    output_path = OUTPUT_DIR / "img2img_sample.png"
    image.save(output_path)
    print(f"Saved img2img sample to {output_path}")
    return duration


def main() -> None:
    text2img_time = run_text2img()
    img2img_time = run_img2img()
    print(f"text2img generation completed in {text2img_time:.2f} seconds")
    print(f"img2img generation completed in {img2img_time:.2f} seconds")


if __name__ == "__main__":
    main()
