from PIL import Image
import requests
from transformers import AutoProcessor, CLIPSegForImageSegmentation
import torch
import matplotlib.pyplot as plt
import numpy as np

def segment_with_prompt(prompts):
    # Load model and processor - Note: Changed to CLIPSegForImageSegmentation
    processor = AutoProcessor.from_pretrained("CIDAS/clipseg-rd64-refined")
    model = CLIPSegForImageSegmentation.from_pretrained("CIDAS/clipseg-rd64-refined")

    # Load image
    url = "C:\\Advey\\genai-genesis\\segmentation\\IMG_3400.jpg"
    image = Image.open(url)

    # Process inputs
    inputs = processor(text=prompts, images=[image] * len(prompts), padding=True, return_tensors="pt")

    # Get segmentation masks
    with torch.no_grad():
        outputs = model(**inputs)
        # The predicted masks are directly in the outputs
        predicted_masks = outputs.logits  # Shape: (batch_size, height, width)
        
    # Visualize the results
    plt.figure(figsize=(10, 10))

    # Display original image
    plt.subplot(1, len(prompts) + 1, 1)
    plt.imshow(image)
    plt.title("Original Image")
    plt.axis("off")

    # Display segmentation masks for each prompt
    for i, prompt in enumerate(prompts):
        plt.subplot(1, len(prompts) + 1, i + 2)
        
        # Apply sigmoid to get probabilities
        mask = predicted_masks[i].sigmoid().cpu().numpy()
        
        # Resize mask to match image dimensions if needed
        if mask.shape != image.size[::-1]:
            mask = np.array(Image.fromarray(mask).resize(image.size))
        
        plt.imshow(image)
        plt.imshow(mask, alpha=0.5, cmap='jet')
        plt.title(f"Mask: {prompt}")
        plt.axis("off")

    plt.tight_layout()
    plt.show()

    # You can also apply a threshold to get binary masks
    binary_masks = [mask > 0.8 for mask in predicted_masks.sigmoid().cpu().numpy()]

    # Example: saving a binary mask as an image
    for i, (mask, prompt) in enumerate(zip(binary_masks, prompts)):
        mask_image = Image.fromarray((mask * 255).astype(np.uint8))
        mask_image.save(f"{prompt.replace(' ', '_')}_mask.png")

if __name__ == "__main__":
    segment_with_prompt(["a chair", "a box", "a table"])