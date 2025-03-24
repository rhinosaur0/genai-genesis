import requests
import base64
import matplotlib.pyplot as plt
from PIL import Image
import io

def test_segmentation_api(image_path, prompts):
    """Test the segmentation API with an image and prompts."""
    # Read and encode the image
    with open(image_path, "rb") as img_file:
        img_data = img_file.read()
        base64_image = base64.b64encode(img_data).decode()
    
    # Prepare the request
    url = "https://segmentation-264982520588.us-central1.run.app/segment"
    # url = "http://127.0.0.1:8080/segment"
    payload = {
        "image": base64_image,
        "prompts": prompts,
        "threshold": 0.7
    }
    
    print(f"Sending request with prompts: {prompts}")
    response = requests.post(url, json=payload)
    
    # Check if request was successful
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return
    
    # Parse the response
    result = response.json()
    
    if result["status"] != "success":
        print(f"API Error: {result.get('message', 'Unknown error')}")
        return
    
    print("Successfully received response!")
    
    # Show and save the combined visualization
    if "visualization" in result:
        vis_bytes = base64.b64decode(result["visualization"])
        vis_img = Image.open(io.BytesIO(vis_bytes))
        
        # Display the image
        plt.figure(figsize=(12, 12))
        plt.imshow(vis_img)
        plt.axis('off')
        plt.show()
        
        # Save the visualization
        vis_img.save("segmentation_result.png")
        print("\nSaved combined visualization as 'segmentation_result.png'")

if __name__ == "__main__":
    # Test with sample image and prompts
    image_path = "test2.jpg"
    prompts = ["chair"]
    test_segmentation_api(image_path, prompts)