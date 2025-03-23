import os
import glob
import json
import base64
import xml.etree.ElementTree as ET


import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
import asyncio

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
    blob = bucket.blob(f"{environment_id}/config.json")
    
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
    print(env_name)
    assets_dir = os.path.join(current_dir, "assets", env_name)
    print(assets_dir)
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
            print({
                "step": step,
                "objects": objects
            })
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

@sio.event
async def start_training(sid, env_name):
    """
    Load all URDF files (and their linked OBJ files) from the assets directory for the given env_name.
    For each URDF file, create a GeneralObject instance.
    Also create an agent instance and build the environment.
    Finally, start the training using the Trainer class.
    """
    env_name = env_name.get("filename")
    objects = []
    object_names = []
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
            object_names.append(mesh_filename)
            obj_instance = GeneralObject(filename=mesh_filename, position=position, env_name = env_name)
            objects.append(obj_instance)
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")
    # Create an agent.
    agent = AgentBall(start_pos=[0, 0, 1], radius=0.2)
    # Build the environment with all objects.
    env = MultiObjectBulletEnv(objects=objects, agent=agent)
    # Create the trainer and start training.
    # Optionally, render (if render() is implemented).

    max_steps = 1000
    obs = env.reset()
    done = False
    step_count = 0
    total_reward = 0
    
    while not done and step_count < max_steps:
        # For now using a simple action (0), this would be replaced with your agent's policy
        action = 0  
        obs, reward, done, info = env.step(action)
        
        print(obs)
        frontend = {'step': step_count,
            'objects': [{"filename": "agent", "position": obs[:3].tolist(), "orientation": obs[3:7].tolist()}]
        }
        for a, object_name in enumerate(object_names):
            frontend['objects'].append({"filename": f"{object_name[:-3]}urdf", "position": obs[7+7*a:10+7*a].tolist(), "orientation": obs[10+7*a:14+7*a].tolist()})

        await sio.emit('simulation_step', frontend, room=sid)
        asyncio.sleep(0.2)
        total_reward += reward
        step_count += 1

        
        if reward == 1:
            print(f"Collision detected at step {step_count}. Reward: {reward}")
            break
    
    print(f"Training finished after {step_count} steps. Total reward: {total_reward}")
    return {"steps": step_count, "total_reward": total_reward, "done": done}





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(asgi_app, host="127.0.0.1", port=int(os.environ.get("PORT", 8000)))
