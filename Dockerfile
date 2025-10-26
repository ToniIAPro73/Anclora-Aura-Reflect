# syntax=docker/dockerfile:1
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Optional system deps for image libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure writable cache locations for Hugging Face / Transformers / Torch
ENV HOME=/app \
    XDG_CACHE_HOME=/app/.cache \
    HF_HOME=/app/.cache/huggingface \
    HF_HUB_CACHE=/app/.cache/huggingface/hub \
    TRANSFORMERS_CACHE=/app/.cache/transformers \
    HF_DATASETS_CACHE=/app/.cache/datasets \
    TORCH_HOME=/app/.cache/torch
RUN mkdir -p /app/.cache \
    /app/.cache/huggingface/hub \
    /app/.cache/transformers \
    /app/.cache/datasets \
    /app/.cache/torch

# Install Python deps
COPY requirements.txt /app/requirements.txt
RUN python -m pip install -r /app/requirements.txt

# Copy project files
COPY . /app

# Default Space port
ENV PORT=7860
EXPOSE 7860

# Start FastAPI app
CMD ["python", "app.py"]