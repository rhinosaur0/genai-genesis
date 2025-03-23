
import requests
task_id = "018a210d-8ba4-705c-b111-1f1776f7f578"
YOUR_API_KEY = 'msy_kGVd0vUErFWnV2RqoDMOcvEXgFJe9gQc4abS'

headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.get(
    f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}",
    headers=headers,
)
response.raise_for_status()
print(response.json())