from transformers import pipeline
from PIL import Image
import requests

def segment(file, imageno):
    # url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/segmentation_input.jpg"
    image = Image.open(requests.get(file, stream=True).raw)

    instance_segmentation = pipeline("image-segmentation", "facebook/mask2former-swin-large-cityscapes-instance")
    pth = "C:\\Advey\\genai-genesis\\segmentation\\segment" + str(imageno) + ".jpg"
    results = instance_segmentation(image)

    seg = results[imageno]['mask']
    label = results[imageno]['label']

    seg.save(pth)







