# Use a Python base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your Flask application
COPY main.py .

# Copy your Kubernetes job YAML file
COPY train-job.yaml .

# Expose the port that Flask will listen on
EXPOSE 8080

# Set the environment variable for the port
ENV PORT 8080

# Run the Flask application
CMD ["python", "main.py"]