FROM python:3.9-slim-bullseye

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 --no-log-init appuser

# Install system dependencies and pip upgrade in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and set permissions
COPY . .
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

CMD ["python", "main.py"]
