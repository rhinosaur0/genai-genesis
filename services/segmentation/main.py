from PIL import Image
from transformers import AutoProcessor, CLIPSegForImageSegmentation
import torch
import numpy as np
import io
import base64
from typing import List, Dict
import logging
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

class SegmentationService:
    def __init__(self):
        # Initialize model and processor once during service startup
        self.processor = AutoProcessor.from_pretrained("CIDAS/clipseg-rd64-refined")
        self.model = CLIPSegForImageSegmentation.from_pretrained("CIDAS/clipseg-rd64-refined")
        
        # Move model to CPU (or GPU if available)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        self.model.eval()  # Set model to evaluation mode

    def process_image(self, image_bytes: bytes, prompts: List[str], threshold: float = 0.8) -> Dict:
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Process inputs
            inputs = self.processor(
                text=prompts, 
                images=[image] * len(prompts), 
                padding=True, 
                return_tensors="pt"
            )
            
            # Move inputs to the same device as model
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Get segmentation masks
            with torch.no_grad():
                outputs = self.model(**inputs)
                predicted_masks = outputs.logits.sigmoid()

            # Convert masks to binary format and then to base64
            mask_results = []
            for i, (mask, prompt) in enumerate(zip(predicted_masks, prompts)):
                # Move mask to CPU and convert to numpy
                mask_np = mask.cpu().numpy()
                
                # Create binary mask
                binary_mask = (mask_np > threshold).astype(np.uint8) * 255
                
                # Convert to PIL Image and then to base64
                mask_image = Image.fromarray(binary_mask)
                buffer = io.BytesIO()
                mask_image.save(buffer, format="PNG")
                base64_mask = base64.b64encode(buffer.getvalue()).decode()
                
                mask_results.append({
                    "prompt": prompt,
                    "mask": base64_mask
                })

            return {
                "status": "success",
                "masks": mask_results
            }

        except Exception as e:
            logging.error(f"Error processing image: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }

# Dont initalize immediatley due to large model size
segmentation_service = None

def get_segmentation_service():
    global segmentation_service
    if segmentation_service is None:
        segmentation_service = SegmentationService()
    return segmentation_service

@app.route('/segment', methods=['POST'])
def segment_image_endpoint():
    """
    API endpoint to segment an image based on text prompts
    
    Expected JSON format:
    {
        "image": "base64_encoded_image_data",
        "prompts": ["prompt1", "prompt2", ...]
    }
    """
    try:
        # This will take a while to load the model
        service = get_segmentation_service()

        data = request.get_json()
        
        if not data or 'image' not in data or 'prompts' not in data:
            return jsonify({"status": "error", "message": "Missing image or prompts"}), 400
        
        # Convert base64 image to bytes
        image_data = base64.b64decode(data['image'])
        prompts = data['prompts']
        
        # Get threshold if provided
        threshold = data.get('threshold', 0.8)
        
        # Process the image
        result = service.process_image(image_data, prompts, threshold)
        return jsonify(result)
    
    except Exception as e:
        logging.error(f"API error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Cloud Run"""
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    # Start the Flask server, listening on all interfaces
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)