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

from pybullet_env.trainer import Trainer  # Ensure these are correctly installed and available
from pybullet_env.env import MultiObjectBulletEnv
from pybullet_env.agent import AgentBall
from pybullet_env.env_object import GeneralObject

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Create a Socket.IO server instance with ASGI mode.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS,
    ping_timeout=60,
    ping_interval=25
)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
# Mount the Socket.IO ASGI app on top of the FastAPI app.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Initialize GCP storage client
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'genai-genesis-storage')

@app.get("/")
def read_root():
    return {"Hello": "World"}

def download_env_from_gcp(env_name):
    """Download all files (URDF and OBJ) from the GCP bucket."""
    bucket = storage_client.bucket(BUCKET_NAME)
    assets_dir = os.path.join(os.getcwd(), "assets", env_name)
    os.makedirs(assets_dir, exist_ok=True)

    prefix = f"{env_name}/objects/"
    blobs = bucket.list_blobs(prefix=prefix)

    for blob in blobs:
        relative_path = blob.name[len(prefix):]
        local_file_path = os.path.join(assets_dir, relative_path)
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        blob.download_to_filename(local_file_path)

    return assets_dir

@sio.event
async def upload_filename(sid, payload):
    """Socket event to scan URDF files and emit data."""
    env_name = payload.get("filename")
    assets_dir = download_env_from_gcp(env_name)
    data = {}
    urdf_files = glob.glob(os.path.join(assets_dir, "**/*.urdf"), recursive=True)

    for urdf_file in urdf_files:
        try:
            tree = ET.parse(urdf_file)
            root = tree.getroot()
            link = root.find("link")
            if link is None:
                continue
            origin = next((child for child in link if child.tag == "origin" and child.get("xyz")), None)
            if origin is None:
                continue
            position = [float(x) for x in origin.get("xyz").split()]
            orientation = [float(x) for x in origin.get("rpy").split()]

            visual = link.find("visual")
            obj_data = None
            if visual and visual.find("geometry") and visual.find("geometry").find("mesh"):
                mesh_filename = visual.find("geometry").find("mesh").get("filename")
                obj_path = os.path.join(os.path.dirname(urdf_file), mesh_filename)
                if os.path.exists(obj_path):
                    with open(obj_path, "rb") as f:
                        obj_data = base64.b64encode(f.read()).decode("utf-8")

            data[os.path.basename(urdf_file)] = {
                "position": position,
                "orientation": orientation,
                "obj_file_data": obj_data,
            }
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")
    await sio.emit("upload_filename_response", data, to=sid)

@sio.event
async def start_simulation(sid, data):
    """Start a simulation that moves objects to the right."""
    objects = data.get('objects', [])
    try:
        for step in range(1, 21):
            for obj in objects:
                if "position" in obj:
                    obj["position"][0] += 0.2
            await sio.emit('simulation_step', {"step": step, "objects": objects}, room=sid)
            await asyncio.sleep(0.1)
        await sio.emit('simulation_complete', {"message": "Simulation completed", "objects": objects}, room=sid)
    except Exception as e:
        print(f"Error during simulation: {e}")
        await sio.emit('simulation_error', {"message": f"Simulation error: {str(e)}"}, room=sid)

def start_training_process(env_name):
    """Start the training process."""
    objects = []
    assets_dir = os.path.join(os.getcwd(), "assets", env_name)
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
    uvicorn.run(asgi_app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))