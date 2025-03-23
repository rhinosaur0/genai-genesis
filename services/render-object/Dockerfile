FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for PyBullet
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libgl1-mesa-dev \
    libglew-dev \
    libosmesa6-dev \
    patchelf \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Service must listen to $PORT environment variable
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 main:app