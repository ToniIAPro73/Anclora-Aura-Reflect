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

# Ensure writable cache locations for Hugging Face / Transformers / Torch (use /tmp which is writable)
ENV HOME=/app \
    XDG_CACHE_HOME=/tmp/.cache \
    HF_HOME=/tmp/hf \
    HF_HUB_CACHE=/tmp/hf/hub \
    TRANSFORMERS_CACHE=/tmp/transformers \
    HF_DATASETS_CACHE=/tmp/datasets \
    TORCH_HOME=/tmp/torch

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