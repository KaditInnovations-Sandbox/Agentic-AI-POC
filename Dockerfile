# ========================================================
# Dockerfile for E-Commerce ADK Agent Backend (FastAPI)
# ========================================================
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY ecommerce_agent/ ./ecommerce_agent/

# Expose backend server port
EXPOSE 8000

# Run FastAPI headless server with Uvicorn
CMD ["uvicorn", "ecommerce_agent.server:app", "--host", "0.0.0.0", "--port", "8000"]
