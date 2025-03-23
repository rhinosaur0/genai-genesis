from PIL import Image
from transformers import AutoProcessor, CLIPSegForImageSegmentation
import torch
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
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

    def process_image(self, image_bytes: bytes, prompts: List[str], threshold: float = 0.8, return_highlighted: bool = True) -> Dict:
        try:
            # Load image from bytes
            original_image = Image.open(io.BytesIO(image_bytes))

            # Process inputs
            inputs = self.processor(
                text=prompts, 
                images=[original_image] * len(prompts),
                return_tensors="pt"
            )
            
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Get segmentation masks
            with torch.no_grad():
                outputs = self.model(**inputs)
                predicted_masks = outputs.logits  # Shape: (batch_size, height, width)

            # Create single figure for overlaid visualization
            plt.figure(figsize=(10, 10))
            plt.imshow(original_image)
            
            colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan']
            color_dict = {
                'red': [1, 0, 0, 0.3],
                'green': [0, 1, 0, 0.3],
                'blue': [0, 0, 1, 0.3],
                'yellow': [1, 1, 0, 0.3],
                'magenta': [1, 0, 1, 0.3],
                'cyan': [0, 1, 1, 0.3]
            }
            
            # Overlay each mask with different colors
            for i, (mask, prompt) in enumerate(zip(predicted_masks, prompts)):
                # Apply sigmoid and get mask
                mask_np = mask.sigmoid().cpu().numpy()
                
                # Resize mask if needed
                if mask_np.shape != (original_image.height, original_image.width):
                    mask_np = np.array(Image.fromarray(mask_np).resize(
                        (original_image.width, original_image.height)
                    ))
                
                # Overlay mask with current color
                color = colors[i % len(colors)]
                colored_mask = np.zeros((*mask_np.shape, 4))
                colored_mask[mask_np > threshold] = color_dict[color]
                plt.imshow(colored_mask)
                
                # Add to legend
                plt.plot([], [], label=prompt, color=color)
            
            # plt.title("Segmentation Results")
            plt.axis("off")
            # plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
            
            # Save visualization
            buffer = io.BytesIO()
            plt.savefig(buffer, format='PNG', bbox_inches='tight', pad_inches=0)
            buffer.seek(0)
            visualization = base64.b64encode(buffer.getvalue()).decode()
            
            plt.close()
            
            return {
                "status": "success",
                "visualization": visualization
            }

        except Exception as e:
            logging.error(f"Error processing image: {str(e)}")
            plt.close()  # Clean up in case of error
            return {
                "status": "error",
                "message": str(e)
            }

    def _mask_to_base64(self, mask_array):
        """Helper method to convert mask array to base64 string"""
        mask_image = Image.fromarray(mask_array)
        buffer = io.BytesIO()
        mask_image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

    def _array_to_base64(self, array):
        """Helper method to convert numpy array to base64 string"""
        image = Image.fromarray(array.astype(np.uint8), 'RGBA')
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

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
        "prompts": ["prompt1", "prompt2", ...],
        "threshold": 0.8  # Optional
    }

    Returns:
    {
        "status": "success" or "error",
        "visualization": "base64_encoded_image_data"  # Combined visualization of all masks
    }
    """
    try:
        service = get_segmentation_service()
        data = request.get_json()
        
        if not data or 'image' not in data or 'prompts' not in data:
            return jsonify({"status": "error", "message": "Missing image or prompts"}), 400
        
        # Convert base64 image to bytes
        image_data = base64.b64decode(data['image'])
        prompts = data['prompts']
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