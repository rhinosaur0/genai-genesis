# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR C:\Advey\genai-genesis\segmentation

# Copy the current directory contents into the container at /usr/src/app
COPY . .

# Copy the image into the container
COPY IMG_3400.jpg C:\Advey\genai-genesis\segmentation

# Install any needed packages
RUN pip install --no-cache-dir --upgrade pip
RUN pip install torch torchvision torchaudio
RUN pip install transformers
RUN pip install Pillow matplotlib numpy requests

# Command to run the clipseg script
CMD ["python", "./clipseg.py"]


