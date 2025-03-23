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
import uvicorn

from training_env.agent import AgentBall
from training_env.env_setup import MultiObjectBulletEnv, GeneralObject
from training_env.trainer import Trainer

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# Mount the Socket.IO ASGI app on top of the FastAPI app.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Initialize GCP storage client
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'genai-genesis-storage')

@app.get("/")
def read_root():
    return {"Hello": "World"}

def download_env_from_gcp(env_id):
    """Download all files (URDF and OBJ) from the GCP bucket."""
    bucket = storage_client.bucket(BUCKET_NAME)
    assets_dir = os.path.join(os.getcwd(), "assets", env_id)
    os.makedirs(assets_dir, exist_ok=True)

    prefix = f"{env_id}/"
    blobs = bucket.list_blobs(prefix=prefix)

    for blob in blobs:
        relative_path = blob.name[len(prefix):]
        local_file_path = os.path.join(assets_dir, relative_path)
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        blob.download_to_filename(local_file_path)

    return assets_dir

@sio.event
async def start_training(sid, data):
    """Start the training process with real-time updates via Socket.IO."""
    env_id = data.get('env_id')
    if not env_id:
        await sio.emit('training_error', {"message": "Environment name not provided"}, room=sid)
        return

    try:
        # Download environment assets from GCP first
        await sio.emit('training_status', {"message": f"Downloading environment '{env_id}' assets..."}, room=sid)
        assets_dir = download_env_from_gcp(env_id)
        
        # Setup objects from URDF files
        objects = []
        urdf_files = glob.glob(os.path.join(assets_dir, "**/*.urdf"), recursive=True)
        
        for urdf_file in urdf_files:
            try:
                tree = ET.parse(urdf_file)
                root = tree.getroot()
                link = root.find("link")
                if link and (origin := next((child for child in link if child.tag == "origin" and child.get("xyz")), None)):
                    position = [float(x) for x in origin.get("xyz").split()]
                    if (visual := link.find("visual")) and (geometry := visual.find("geometry")) and (mesh := geometry.find("mesh")):
                        mesh_filename = os.path.basename(mesh.get("filename"))
                        objects.append(GeneralObject(filename=mesh_filename, position=position))
            except Exception as e:
                print(f"Error processing {urdf_file}: {e}")
        
        # Initialize agent, environment and trainer
        agent = AgentBall(start_pos=[0, 0, 1], radius=0.2)
        env = MultiObjectBulletEnv(objects=objects, agent=agent)
        trainer = Trainer(env)
        
        # Start training with progress updates
        await sio.emit('training_started', {"message": "Training started", "object_count": len(objects)}, room=sid)
        
        # Assuming trainer.train() is modified to yield step info or we create a custom training loop
        for step, step_data in enumerate(trainer.train_with_updates()):
            # Send update with step number, reward, and any other relevant data
            await sio.emit('training_step', {
                "step": step,
                "agent_position": step_data.get("position", [0, 0, 0]),
                "reward": step_data.get("reward", 0),
                "objects": [{"position": obj.position} for obj in objects]
            }, room=sid)
            await asyncio.sleep(0.05)  # Small delay to prevent flooding
        
        # Training complete
        await sio.emit('training_complete', {
            "message": "Training completed successfully",
            "final_reward": trainer.get_total_reward()
        }, room=sid)
        
    except Exception as e:
        print(f"Error during training: {e}")
        await sio.emit('training_error', {"message": f"Training error: {str(e)}"}, room=sid)

def start_training_process(env_id):
    """Start the training process."""
    objects = []
    assets_dir = os.path.join(os.getcwd(), "assets", env_id)
    urdf_files = glob.glob(os.path.join(assets_dir, "**/*.urdf"), recursive=True)
    for urdf_file in urdf_files:
        try:
            tree = ET.parse(urdf_file)
            root = tree.getroot()
            link = root.find("link")
            if link and (origin := next((child for child in link if child.tag == "origin" and child.get("xyz")), None)):
                position = [float(x) for x in origin.get("xyz").split()]
                if (visual := link.find("visual")) and (geometry := visual.find("geometry")) and (mesh := geometry.find("mesh")):
                    mesh_filename = os.path.basename(mesh.get("filename"))
                    objects.append(GeneralObject(filename=mesh_filename, position=position))
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")

    agent = AgentBall(start_pos=[0, 0, 1], radius=0.2)
    env = MultiObjectBulletEnv(objects=objects, agent=agent)
    trainer = Trainer(env)
    training_result = trainer.train()
    env.render()
    return training_result

if __name__ == "__main__":
    # uvicorn.run(asgi_app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
    start_training_process("simple_env")