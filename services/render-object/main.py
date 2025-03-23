import os
import json
import tempfile
import base64
from flask import Flask, request, jsonify
import pybullet as p
import numpy as np
from google.cloud import storage
import time
from PIL import Image
import trimesh
import io
import uuid
import threading
import socket

app = Flask(__name__)

# Initialize GCP storage client
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'your-bucket-name')

# Dictionary to keep track of active simulations
active_simulations = {}

def get_environment_config(environment_id):
    """Get environment configuration from GCP bucket"""
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"environments/{environment_id}/config.json")
    
    # Download as string and parse JSON
    content = blob.download_as_string()
    return json.loads(content)

def download_from_gcp(object_id):
    """
    Download object file from GCP bucket to a temporary file
    and return path, encoded content, and file type
    """
    bucket = storage_client.bucket(BUCKET_NAME)
    
    # First try to find which file extension exists
    file_types = ['urdf', 'sdf', 'mjcf', 'obj']
    blob = None
    file_type = None
    
    for ext in file_types:
        test_blob = bucket.blob(f"objects/{object_id}.{ext}")
        if test_blob.exists():
            blob = test_blob
            file_type = ext
            break
    
    if blob is None:
        # Try without extension (maybe the object_id already includes the extension)
        blob = bucket.blob(f"objects/{object_id}")
        if blob.exists():
            # Determine file type from object_id
            for ext in file_types:
                if object_id.lower().endswith(f".{ext}"):
                    file_type = ext
                    break
            if file_type is None:
                # Default to OBJ if can't determine
                file_type = 'obj'
    
    if blob is None:
        raise Exception(f"Object {object_id} not found in bucket")
    
    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    temp_file_path = temp_file.name
    temp_file.close()
    
    # Download to the temporary file
    blob.download_to_filename(temp_file_path)
    
    # Also get file content as base64 for the response
    file_content = base64.b64encode(blob.download_as_bytes()).decode('utf-8')
    
    return temp_file_path, file_content, file_type

@app.route('/render_environment', methods=['POST'])
def render_environment():
    """
    Render the environment and return a 3D model file (GLB) for frontend viewing.
    
    Expected request format:
    {
        "environment_id": "env_123",
        "width": 1024,           # Optional: width of the viewport
        "height": 768,           # Optional: height of the viewport
        "camera_position": [x,y,z],  # Optional: camera position
        "target_position": [x,y,z]   # Optional: camera target
    }
    """
    request_data = request.get_json()
    environment_id = request_data.get('environment_id')
    
    if not environment_id:
        return jsonify({'error': 'Missing environment_id'}), 400
    
    # Get optional parameters with defaults
    width = request_data.get('width', 1024)
    height = request_data.get('height', 768)
    camera_position = request_data.get('camera_position', [3, 3, 3])
    target_position = request_data.get('target_position', [0, 0, 0])
    
    try:
        # Get environment config (list of objects) from GCP
        environment_config = get_environment_config(environment_id)
        object_list = environment_config.get('objects', [])
        
        if not object_list:
            return jsonify({'error': 'No objects found for this environment'}), 404
        
        # Connect to PyBullet with GUI for rendering (we'll make it offscreen)
        p.connect(p.GUI, options="--width={} --height={} --opengl2".format(width, height))
        p.configureDebugVisualizer(p.COV_ENABLE_GUI, 0)
        p.configureDebugVisualizer(p.COV_ENABLE_SHADOWS, 1)
        
        # Set up the scene
        p.setGravity(0, 0, -9.81)  # Set gravity
        
        # Load each object
        loaded_obj_ids = []
        for obj_info in object_list:
            obj_id = obj_info['id']
            try:
                # Download the object file from GCP
                object_path, _, file_type = download_from_gcp(obj_id)
                
                # Load the object into PyBullet with position/orientation if provided
                position = obj_info.get('position', [0, 0, 0])
                orientation = obj_info.get('orientation', [0, 0, 0, 1])
                
                if file_type == 'urdf':
                    pb_obj_id = p.loadURDF(object_path, position, orientation)
                elif file_type == 'sdf':
                    pb_obj_id = p.loadSDF(object_path)
                elif file_type == 'mjcf':
                    pb_obj_id = p.loadMJCF(object_path)
                elif file_type == 'obj':
                    visual_shape_id = p.createVisualShape(
                        shapeType=p.GEOM_MESH,
                        fileName=object_path
                    )
                    pb_obj_id = p.createMultiBody(
                        baseMass=0,
                        basePosition=position,
                        baseOrientation=orientation,
                        baseVisualShapeIndex=visual_shape_id
                    )
                else:
                    # Skip unsupported files
                    continue
                
                loaded_obj_ids.append(pb_obj_id)
                
                # Clean up the temp file
                os.unlink(object_path)
                
            except Exception as e:
                print(f"Error loading object {obj_id}: {str(e)}")
        
        # Allow the scene to settle (run physics for a short time)
        for _ in range(10):
            p.stepSimulation()
        
        # Set up the camera view
        view_matrix = p.computeViewMatrix(
            cameraEyePosition=camera_position,
            cameraTargetPosition=target_position,
            cameraUpVector=[0, 0, 1]
        )
        
        projection_matrix = p.computeProjectionMatrixFOV(
            fov=60.0,
            aspect=float(width)/height,
            nearVal=0.01,
            farVal=100.0
        )
        
        # Create a temp directory for the output
        with tempfile.TemporaryDirectory() as temp_dir:
            # Export the scene to an OBJ file
            obj_filename = os.path.join(temp_dir, "rendered_scene.obj")
            
            # Method 1: Use PyBullet's export function
            p.exportMesh(obj_filename, loaded_obj_ids[0] if loaded_obj_ids else -1)
            
            # Convert OBJ to GLB (better for web viewing)
            try:
                mesh = trimesh.load(obj_filename)
                glb_filename = os.path.join(temp_dir, "rendered_scene.glb")
                mesh.export(glb_filename)
                
                # Read the GLB file and encode to base64
                with open(glb_filename, "rb") as f:
                    glb_content = f.read()
                    glb_base64 = base64.b64encode(glb_content).decode('utf-8')
                
                # Disconnect from PyBullet
                p.disconnect()
                
                # Return the GLB file as base64 along with rendering metadata
                response = {
                    'environment_id': environment_id,
                    'format': 'glb',
                    'content': glb_base64,
                    'width': width,
                    'height': height,
                    'camera_position': camera_position,
                    'target_position': target_position
                }
                
                return jsonify(response)
                
            except Exception as e:
                # If trimesh fails, try an alternative approach with screenshots
                print(f"Failed to convert to GLB: {str(e)}")
                
                # Take a few screenshots from different angles
                screenshots = []
                for angle in range(0, 360, 45):
                    # Rotate camera around the scene
                    rad = angle * np.pi / 180.0
                    radius = 5.0
                    camera_pos = [radius * np.cos(rad), radius * np.sin(rad), 3]
                    
                    view_matrix = p.computeViewMatrix(
                        cameraEyePosition=camera_pos,
                        cameraTargetPosition=[0, 0, 0],
                        cameraUpVector=[0, 0, 1]
                    )
                    
                    # Render
                    img = p.getCameraImage(width, height, view_matrix, projection_matrix)
                    
                    # Convert the raw RGBA to a PNG image
                    rgba = np.array(img[2], dtype=np.uint8).reshape((height, width, 4))
                    rgb = rgba[:,:,:3]  # Extract RGB
                    
                    # Save to memory buffer
                    img_buffer = io.BytesIO()
                    Image.fromarray(rgb).save(img_buffer, format='PNG')
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    screenshots.append({
                        'angle': angle,
                        'image': img_base64
                    })
                
                # Disconnect from PyBullet
                p.disconnect()
                
                # Return the screenshots as a fallback
                response = {
                    'environment_id': environment_id,
                    'format': 'images',
                    'screenshots': screenshots,
                    'width': width,
                    'height': height
                }
                
                return jsonify(response)
                
    except Exception as e:
        if p.isConnected():
            p.disconnect()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # This is used when running locally
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))