# Use an official Python runtime as a parent image
FROM python:3.9-slim-bullseye

# Set the working directory in the container
WORKDIR /app

# Create a non-root user
RUN useradd -m -u 1000 --no-log-init appuser

# Install dependencies in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && chown -R appuser:appuser /app

# Copy the application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Make port 8080 available
EXPOSE 8080

# Define environment variable
ENV PORT=8080

# Run gunicorn server
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--workers", "1", "--threads", "8", "--timeout", "0", "main:app"]
