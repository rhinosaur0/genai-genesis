from transformers import pipeline
from PIL import Image
import requests

def segment(file):
    # url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/segmentation_input.jpg"
    image = Image.open(requests.get(file, stream=True).raw)

    instance_segmentation = pipeline("image-segmentation", "facebook/mask2former-swin-large-cityscapes-instance")
    pth = "C:\\Advey\\genai-genesis\\segmentation\\segment.jpg"
    results = instance_segmentation(image)

    seg = results[2]['mask']

    seg.save(pth)







