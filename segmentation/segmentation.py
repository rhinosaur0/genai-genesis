from transformers import pipeline
from PIL import Image
import requests

def segment(file, imageno):
    url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/segmentation_input.jpg"
    image = Image.open(requests.get(url, stream=True).raw)

    instance_segmentation = pipeline("image-segmentation", "facebook/mask2former-swin-large-cityscapes-instance")
    pth = "C:\\Advey\\genai-genesis\\segmentation\\segment" + str(imageno) + ".png"
    results = instance_segmentation(image)

    seg = results[imageno]['mask']
    seg = seg.convert("L")
    rgb = Image.new("RGBA", image.size, (0, 0, 0, 0))
    rgb.paste(image, mask=seg)
    label = results[imageno]['label'] 
    new_width = rgb.width * 10
    new_height = rgb.height * 10
    new_size = (new_width, new_height)
    rgb = rgb.resize(new_size, Image.BICUBIC)
    rgb.save(pth)
    

segment("C:\\Advey\\genai-genesis\\segmentation\\tablechair.jpg", 1)





