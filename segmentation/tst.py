import requests
import torch
from PIL import Image, ImageDraw
from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation

# Load Mask2Former fine-tuned on ADE20k semantic segmentation
processor = AutoImageProcessor.from_pretrained("facebook/mask2former-swin-large-ade-semantic")
model = Mask2FormerForUniversalSegmentation.from_pretrained("facebook/mask2former-swin-large-ade-semantic")

# URL of an image to segment
url = "http://images.cocodataset.org/val2017/000000039769.jpg"
image = Image.open(requests.get(url, stream=True).raw)

# Process the image for the model
inputs = processor(images=image, return_tensors="pt")

# Inference
with torch.no_grad():
    outputs = model(**inputs)

# Model output: class_queries_logits and masks_queries_logits
class_queries_logits = outputs.class_queries_logits
masks_queries_logits = outputs.masks_queries_logits

# Postprocess to get the predicted segmentation masks
predicted_semantic_map = processor.post_process_semantic_segmentation(outputs, target_sizes=[image.size[::-1]])[0]

# Now extract individual masks for each object
num_objects = masks_queries_logits.shape[1]  # Number of objects in the image (queries)
object_masks = []

for i in range(num_objects):
    mask = masks_queries_logits[0, i].sigmoid().cpu().numpy()  # Get the mask for object i
    mask = (mask > 0.5).astype('uint8')  # Binarize the mask (threshold > 0.5)
    
    # Convert to PIL Image for easier handling and visualization
    mask_image = Image.fromarray(mask * 255)  # Convert to [0, 255] for visualization
    object_masks.append(mask_image)

# Displaying individual masks for each object
for idx, mask in enumerate(object_masks):
    mask.show(title=f"Object {idx+1} Mask")

# Optionally, save each individual mask to disk
for idx, mask in enumerate(object_masks):
    mask.save(f"object_{idx+1}_mask.png")
