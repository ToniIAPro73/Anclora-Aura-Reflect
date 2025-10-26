from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
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

class GenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: str
    temperature: float

    @field_validator('aspect_ratio')
    @classmethod
    def validate_aspect_ratio(cls, v):
        valid_ratios = {
            "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"
        }
        if v not in valid_ratios:
            raise ValueError(f'Invalid aspect_ratio. Must be one of {valid_ratios}')
        return v

class RefineRequest(BaseModel):
    images: list[str]  # base64 strings
    refine_prompt: str

def base64_to_image(b64_string: str) -> Image.Image:
    image_data = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(image_data))

def image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

@app.post("/generate")
async def generate_images(request: GenerateRequest):
    try:
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
        }
        width, height = ratios.get(request.aspect_ratio, (512, 512))

        # Generate images
        guidance_scale = 7 + (request.temperature * 8)  # Map temperature (0-1) to guidance (7-15)
        images = sd_pipe(
            request.prompt,
            width=width,
            height=height,
            num_images_per_prompt=NUM_IMAGES,
            guidance_scale=guidance_scale,
        ).images

        return {"images": [image_to_base64(img) for img in images]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refine")
async def refine_images(request: RefineRequest):
    try:
        # Describe images using BLIP
        descriptions = []
        for b64 in request.images:
            try:
                image = base64_to_image(b64)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 string in images")
            inputs = blip_processor(image, return_tensors="pt").to(device)
            out = blip_model.generate(**inputs, max_length=50)
            description = blip_processor.decode(out[0], skip_special_tokens=True)
            descriptions.append(description)

        # Combine descriptions with refine prompt
        combined_prompt = f"Based on: {'; '.join(descriptions)}. Incorporate: {request.refine_prompt}"

        # Generate new images
        images = sd_pipe(combined_prompt, num_images_per_prompt=NUM_IMAGES, guidance_scale=10).images

        return {"images": [image_to_base64(img) for img in images]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)