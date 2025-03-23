import os
import glob
import json
import base64
import tempfile
import xml.etree.ElementTree as ET

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
import asyncio

from pybullet_env.trainer import Trainer
from pybullet_env.env import MultiObjectBulletEnv
from pybullet_env.agent import AgentBall
from pybullet_env.env_object import GeneralObject

# Create a Socket.IO server instance with ASGI mode.
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=["http://localhost:3000"])
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount the Socket.IO ASGI app on top of the FastAPI app.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Initialize GCP storage client
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'your-bucket-name')


@app.get("/")
def read_root():
    return {"Hello": "World"}

def get_environment_config(environment_id):
    """Get environment configuration from GCP bucket"""
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"environments/{environment_id}/config.json")
    
    # Download as string and parse JSON
    content = blob.download_as_string()
    return json.loads(content)



def render_environment(env_name):
    """
    Download all files (URDF and OBJ) from the GCP bucket for the given environment
    into the /assets directory (in the current working directory) while preserving folder structure.
    """
    # Set up GCP storage bucket.
    bucket = storage.Client().bucket("genai-genesis-storage")
    
    # Define the local directory as "./assets"
    local_dir = os.path.join(os.getcwd(), "assets")
    os.makedirs(local_dir, exist_ok=True)
    
    # Assume your objects are stored under objects/{env_name}/...
    prefix = f"{env_name}/objects"
    blobs = bucket.list_blobs(prefix=prefix)
    
    for blob in blobs:
        # Reconstruct local path:
        relative_path = blob.name[len(prefix):]  # file path relative to env folder
        local_file_path = os.path.join(local_dir, relative_path)
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        blob.download_to_filename(local_file_path)
        print(f"Downloaded {blob.name} to {local_file_path}")
    
    return local_dir

def download_env_from_gcp(env_name):
    """
    Download all files (URDF and OBJ) from the GCP bucket for the given environment
    into a temporary local directory while preserving folder structure.
    """

    bucket = storage.Client().bucket("genai-genesis-storage")
    
    # Create an "assets" directory in the current working directory
    current_dir = os.getcwd()
    assets_dir = os.path.join(current_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    prefix = f"{env_name}/objects/"
    blobs = bucket.list_blobs(prefix=prefix)

    print(f"Downloading files from {prefix} to {assets_dir}")
    
    for blob in blobs:
        # Reconstruct local path relative to the assets directory
        relative_path = blob.name[len(prefix):]  # file path relative to env folder
        local_file_path = os.path.join(assets_dir, relative_path)
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        blob.download_to_filename(local_file_path)
        print(f"Downloaded {blob.name} to {local_file_path}")
    
    return assets_dir

@sio.event
async def upload_filename(sid, payload):
    """
    Socket event that scans the assets directory for URDF files.
    For each URDF file, it extracts the position, orientation (from the <origin> element)
    and reads the associated OBJ file (which is base64 encoded) from the visual element.
    Then, it emits the data back to the client.
    """
    print(f"Received payload from {sid}: {payload}")
    env_name = payload.get("filename")
    assets_dir = download_env_from_gcp(env_name)
    
    # Initialize a dictionary to hold data per URDF file.
    data = {}

    # Find all URDF files recursively.
    urdf_files = glob.glob(os.path.join(assets_dir, "**/*.urdf"), recursive=True)
    for urdf_file in urdf_files:
        try:
            tree = ET.parse(urdf_file)
            root = tree.getroot()
            link = root.find("link")
            if link is None:
                continue
            # Look for an origin element that is a direct child of link.
            origin = None
            for child in link:
                if child.tag == "origin" and child.get("xyz"):
                    origin = child
                    break
            if origin is None:
                continue
            xyz_str = origin.get("xyz")
            rpy_str = origin.get("rpy")
            position = [float(x) for x in xyz_str.split()]
            orientation = [float(x) for x in rpy_str.split()]

            # Extract the mesh filename from the visual element.
            visual = link.find("visual")
            obj_data = None
            if visual is not None:
                geometry = visual.find("geometry")
                if geometry is not None:
                    mesh = geometry.find("mesh")
                    if mesh is not None:
                        mesh_filename = mesh.get("filename")
                        # Resolve the mesh file path relative to the URDF file.
                        urdf_dir = os.path.dirname(urdf_file)
                        obj_path = os.path.join(urdf_dir, mesh_filename)
                        print(obj_path)
                        if os.path.exists(obj_path):
                            # Open in binary mode and encode in base64.
                            with open(obj_path, "rb") as f:
                                encoded_bytes = base64.b64encode(f.read())
                                obj_data = encoded_bytes.decode("utf-8")
            file_key = os.path.basename(urdf_file)
            data[file_key] = {
                "position": position,
                "orientation": orientation,
                "obj_file_data": obj_data
            }
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")
    # Emit the result back to the client.
    await sio.emit("upload_filename_response", data, to=sid)

@sio.event
async def start_simulation(sid, data):
    """Start a simulation that moves objects to the right"""
    print(f"Starting simulation for client {sid}")
    objects = data.get('objects', [])
    
    try:
        # Run 20 simulation steps
        for step in range(1, 21):
            # Update each object position (move 0.2 units to the right on each step)
            for obj in objects:
                if "position" in obj:
                    # Increase x position by 0.2
                    obj["position"][0] += 0.2
            
            # Send the updated positions to the client
            await sio.emit('simulation_step', {
                "step": step,
                "objects": objects
            }, room=sid)
            
            # Wait a short time between steps
            await asyncio.sleep(0.1)
        
        # Send simulation completed message
        await sio.emit('simulation_complete', {
            "message": "Simulation completed",
            "objects": objects
        }, room=sid)
        
    except Exception as e:
        print(f"Error during simulation: {e}")
        await sio.emit('simulation_error', {
            "message": f"Simulation error: {str(e)}"
        }, room=sid)

def start_training_process(env_name):
    """
    Load all URDF files (and their linked OBJ files) from the assets directory for the given env_name.
    For each URDF file, create a GeneralObject instance.
    Also create an agent instance and build the environment.
    Finally, start the training using the Trainer class.
    """
    objects = []
    assets_dir = os.path.join(os.getcwd(), "assets", env_name)
    # Find all URDF files recursively.
    urdf_files = glob.glob(os.path.join(assets_dir, "**/*.urdf"), recursive=True)
    for urdf_file in urdf_files:
        try:
            tree = ET.parse(urdf_file)
            root = tree.getroot()
            link = root.find("link")
            if link is None:
                continue
            origin = None
            for child in link:
                if child.tag == "origin" and child.get("xyz"):
                    origin = child
                    break
            if origin is None:
                continue
            xyz_str = origin.get("xyz")
            rpy_str = origin.get("rpy")
            position = [float(x) for x in xyz_str.split()]
            # We use only the position for loading the object.
            # Extract the mesh filename from the visual element.
            visual = link.find("visual")
            if visual is not None:
                geometry = visual.find("geometry")
                if geometry is not None:
                    mesh = geometry.find("mesh")
                    if mesh is not None:
                        mesh_filename = os.path.basename(mesh.get("filename"))
                    else:
                        continue
                else:
                    continue
            else:
                continue
            # Create a GeneralObject instance for this object.
            obj_instance = GeneralObject(filename=mesh_filename, position=position)
            objects.append(obj_instance)
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")
    # Create an agent.
    agent = AgentBall(name="agent", start_pos=[0, 0, 1], radius=0.2)
    # Build the environment with all objects.
    env = MultiObjectBulletEnv(objects=objects, agent=agent)
    # Create the trainer and start training.
    trainer = Trainer(env)
    training_result = trainer.train()
    # Optionally, render (if render() is implemented).
    env.render()
    return training_result




# @app.route('/render_environment', methods=['POST'])
# def render_environment():
#     """
#     Render the environment and return a 3D model file (GLB) for frontend viewing.
    
#     Expected request format:
#     {
#         "environment_id": "env_123",
#         "width": 1024,           # Optional: width of the viewport
#         "height": 768,           # Optional: height of the viewport
#         "camera_position": [x,y,z],  # Optional: camera position
#         "target_position": [x,y,z]   # Optional: camera target
#     }
#     """
#     request_data = request.get_json()
#     environment_id = request_data.get('environment_id')
    
#     if not environment_id:
#         return jsonify({'error': 'Missing environment_id'}), 400
    
#     # Get optional parameters with defaults
#     width = request_data.get('width', 1024)
#     height = request_data.get('height', 768)
#     camera_position = request_data.get('camera_position', [3, 3, 3])
#     target_position = request_data.get('target_position', [0, 0, 0])
    
#     try:
#         # Get environment config (list of objects) from GCP
#         environment_config = get_environment_config(environment_id)
#         object_list = environment_config.get('objects', [])
        
#         if not object_list:
#             return jsonify({'error': 'No objects found for this environment'}), 404
        
#         # Connect to PyBullet with GUI for rendering (we'll make it offscreen)
#         p.connect(p.GUI, options="--width={} --height={} --opengl2".format(width, height))
#         p.configureDebugVisualizer(p.COV_ENABLE_GUI, 0)
#         p.configureDebugVisualizer(p.COV_ENABLE_SHADOWS, 1)
        
#         # Set up the scene
#         p.setGravity(0, 0, -9.81)  # Set gravity
        
#         # Load each object
#         loaded_obj_ids = []
#         for obj_info in object_list:
#             obj_id = obj_info['id']
#             try:
#                 # Download the object file from GCP
#                 object_path, _, file_type = download_from_gcp(obj_id)
                
#                 # Load the object into PyBullet with position/orientation if provided
#                 position = obj_info.get('position', [0, 0, 0])
#                 orientation = obj_info.get('orientation', [0, 0, 0, 1])
                
#                 if file_type == 'urdf':
#                     pb_obj_id = p.loadURDF(object_path, position, orientation)
#                 elif file_type == 'sdf':
#                     pb_obj_id = p.loadSDF(object_path)
#                 elif file_type == 'mjcf':
#                     pb_obj_id = p.loadMJCF(object_path)
#                 elif file_type == 'obj':
#                     visual_shape_id = p.createVisualShape(
#                         shapeType=p.GEOM_MESH,
#                         fileName=object_path
#                     )
#                     pb_obj_id = p.createMultiBody(
#                         baseMass=0,
#                         basePosition=position,
#                         baseOrientation=orientation,
#                         baseVisualShapeIndex=visual_shape_id
#                     )
#                 else:
#                     # Skip unsupported files
#                     continue
                
#                 loaded_obj_ids.append(pb_obj_id)
                
#                 # Clean up the temp file
#                 os.unlink(object_path)
                
#             except Exception as e:
#                 print(f"Error loading object {obj_id}: {str(e)}")
        
#         # Allow the scene to settle (run physics for a short time)
#         for _ in range(10):
#             p.stepSimulation()
        
#         # Set up the camera view
#         view_matrix = p.computeViewMatrix(
#             cameraEyePosition=camera_position,
#             cameraTargetPosition=target_position,
#             cameraUpVector=[0, 0, 1]
#         )
        
#         projection_matrix = p.computeProjectionMatrixFOV(
#             fov=60.0,
#             aspect=float(width)/height,
#             nearVal=0.01,
#             farVal=100.0
#         )
        
#         # Create a temp directory for the output
#         with tempfile.TemporaryDirectory() as temp_dir:
#             # Export the scene to an OBJ file
#             obj_filename = os.path.join(temp_dir, "rendered_scene.obj")
            
#             # Method 1: Use PyBullet's export function
#             p.exportMesh(obj_filename, loaded_obj_ids[0] if loaded_obj_ids else -1)
            
#             # Convert OBJ to GLB (better for web viewing)
#             try:
#                 mesh = trimesh.load(obj_filename)
#                 glb_filename = os.path.join(temp_dir, "rendered_scene.glb")
#                 mesh.export(glb_filename)
                
#                 # Read the GLB file and encode to base64
#                 with open(glb_filename, "rb") as f:
#                     glb_content = f.read()
#                     glb_base64 = base64.b64encode(glb_content).decode('utf-8')
                
#                 # Disconnect from PyBullet
#                 p.disconnect()
                
#                 # Return the GLB file as base64 along with rendering metadata
#                 response = {
#                     'environment_id': environment_id,
#                     'format': 'glb',
#                     'content': glb_base64,
#                     'width': width,
#                     'height': height,
#                     'camera_position': camera_position,
#                     'target_position': target_position
#                 }
                
#                 return jsonify(response)
                
#             except Exception as e:
#                 # If trimesh fails, try an alternative approach with screenshots
#                 print(f"Failed to convert to GLB: {str(e)}")
                
#                 # Take a few screenshots from different angles
#                 screenshots = []
#                 for angle in range(0, 360, 45):
#                     # Rotate camera around the scene
#                     rad = angle * np.pi / 180.0
#                     radius = 5.0
#                     camera_pos = [radius * np.cos(rad), radius * np.sin(rad), 3]
                    
#                     view_matrix = p.computeViewMatrix(
#                         cameraEyePosition=camera_pos,
#                         cameraTargetPosition=[0, 0, 0],
#                         cameraUpVector=[0, 0, 1]
#                     )
                    
#                     # Render
#                     img = p.getCameraImage(width, height, view_matrix, projection_matrix)
                    
#                     # Convert the raw RGBA to a PNG image
#                     rgba = np.array(img[2], dtype=np.uint8).reshape((height, width, 4))
#                     rgb = rgba[:,:,:3]  # Extract RGB
                    
#                     # Save to memory buffer
#                     img_buffer = io.BytesIO()
#                     Image.fromarray(rgb).save(img_buffer, format='PNG')
#                     img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
#                     screenshots.append({
#                         'angle': angle,
#                         'image': img_base64
#                     })
                
#                 # Disconnect from PyBullet
#                 p.disconnect()
                
#                 # Return the screenshots as a fallback
#                 response = {
#                     'environment_id': environment_id,
#                     'format': 'images',
#                     'screenshots': screenshots,
#                     'width': width,
#                     'height': height
#                 }
                
#                 return jsonify(response)
                
#     except Exception as e:
#         if p.isConnected():
#             p.disconnect()
#         return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(asgi_app, host="127.0.0.1", port=int(os.environ.get("PORT", 8000)))