from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Dict
from diffusers import StableDiffusionPipeline
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch
from PIL import Image
import base64
import io
import numpy as np

app = FastAPI()

NUM_IMAGES = 2

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8082", "http://127.0.0.1:8082"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
device = "cuda" if torch.cuda.is_available() else "cpu"
try:
    sd_pipe = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4").to(device)
    blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
except Exception as e:
    raise RuntimeError(f"Failed to load models: {str(e)}")

def base64_to_image(b64_string: str) -> Image.Image:
    image_data = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(image_data))

def image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def _extract_aspect_ratio(payload: Dict[str, Any]) -> str:
    raw_ratio = payload.get("aspectRatio") or payload.get("aspect_ratio") or payload.get("aspectratio")
    if raw_ratio is None:
        raise HTTPException(status_code=422, detail="aspectRatio field is required.")
    valid_ratios = {
        "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "Auto"
    }
    if raw_ratio not in valid_ratios:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid aspectRatio. Must be one of {sorted(valid_ratios)}",
        )
    return raw_ratio


def _extract_temperature(payload: Dict[str, Any]) -> float:
    temp = payload.get("temperature")
    if temp is None:
        raise HTTPException(status_code=422, detail="temperature field is required.")
    try:
        return float(temp)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="temperature must be a number.")


@app.post("/generate")
async def generate_images(payload: Dict[str, Any] = Body(...)):
    try:
        prompt = payload.get("prompt")
        if not prompt or not isinstance(prompt, str):
            raise HTTPException(status_code=422, detail="prompt field is required.")

        aspect_ratio = _extract_aspect_ratio(payload)
        temperature = _extract_temperature(payload)

        # Map aspect ratio to SD dimensions
        ratios = {
            "1:1": (512, 512),
            "9:16": (512, 912),
            "16:9": (912, 512),
            "3:4": (512, 682),
            "4:3": (682, 512),
            "3:2": (768, 512),
            "2:3": (512, 768),
            "5:4": (640, 512),
            "4:5": (512, 640),
            "21:9": (1152, 512),
            "Auto": (512, 512),
        }
        width, height = ratios.get(aspect_ratio, (512, 512))

        # Generate images
        guidance_scale = 7 + (temperature * 8)  # Map temperature (0-1) to guidance (7-15)
        images = sd_pipe(
            prompt,
            width=width,
            height=height,
            num_images_per_prompt=NUM_IMAGES,
            guidance_scale=guidance_scale,
        ).images

        return {"images": [image_to_base64(img) for img in images]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refine")
async def refine_images(payload: Dict[str, Any] = Body(...)):
    try:
        raw_images = payload.get("images") or payload.get("baseImages")
        if not isinstance(raw_images, list) or not raw_images:
            raise HTTPException(status_code=422, detail="images field must contain base64 strings.")

        refine_prompt = payload.get("refinePrompt") or payload.get("prompt")
        if not refine_prompt or not isinstance(refine_prompt, str):
            raise HTTPException(status_code=422, detail="refinePrompt field is required.")

        # Describe images using BLIP
        descriptions = []
        for b64 in raw_images:
            try:
                image = base64_to_image(b64)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 string in images")
            inputs = blip_processor(image, return_tensors="pt").to(device)
            out = blip_model.generate(**inputs, max_length=50)
            description = blip_processor.decode(out[0], skip_special_tokens=True)
            descriptions.append(description)

        # Combine descriptions with refine prompt
        combined_prompt = f"Based on: {'; '.join(descriptions)}. Incorporate: {refine_prompt}"

        # Generate new images
        images = sd_pipe(combined_prompt, num_images_per_prompt=NUM_IMAGES, guidance_scale=10).images

        return {"images": [image_to_base64(img) for img in images]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
