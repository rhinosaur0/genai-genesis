import requests

YOUR_API_KEY = 'msy_kGVd0vUErFWnV2RqoDMOcvEXgFJe9gQc4abS'

payload = {
     # Using data URI example
     # image_url: f'data:image/png;base64,{YOUR_BASE64_ENCODED_IMAGE_DATA}',
    "image_url": "https://i.ebayimg.com/images/g/i5IAAOSwgyxWVOIQ/s-l1200.jpg",
    "enable_pbr": True,
    "should_remesh": True,
    "should_texture": True

}
headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.post(
    "https://api.meshy.ai/openapi/v1/image-to-3d",
    headers=headers,
    json=payload,
)
response.raise_for_status()
print(response.json())


