from typing import List, Tuple, Dict, Any
from fastapi import FastAPI, Depends
from pydantic import BaseModel
import uvicorn
from pybullet_env.env import BulletEnv
from fastapi import FastAPI, Request
import socketio
import os
import xml.etree.ElementTree as ET
import uuid
from kubernetes import client, config

app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi')
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Pydantic models for input validation
class FilenamePayload(BaseModel):
    filename: str

class ObjectPositionPayload(BaseModel):
    filename: str
    position: List[float]
    orientation: List[float]

class PositionPayload(BaseModel):
    objects: List[ObjectPositionPayload]

# Session metadata to track client-specific data
session_metadata = {}

# Path configurations
OBJ_DIR = os.path.join(os.getcwd(), "meshes")
URDF_DIR = os.path.join(os.getcwd(), "urdf")

# Ensure directories exist
os.makedirs(OBJ_DIR, exist_ok=True)
os.makedirs(URDF_DIR, exist_ok=True)

class Trainer:
    def __init__(self, env, max_steps=1000):
        self.env = env
        self.max_steps = max_steps
    
    def train(self):
        obs = self.env.reset()
        done = False
        step_count = 0
        total_reward = 0
        
        while not done and step_count < self.max_steps:
            # For now using a simple action (0), this would be replaced with your agent's policy
            action = 0  
            obs, reward, done, info = self.env.step(action)
            total_reward += reward
            step_count += 1
            
            if reward == 1:
                print(f"Collision detected at step {step_count}. Reward: {reward}")
                break
        
        print(f"Training finished after {step_count} steps. Total reward: {total_reward}")
        return {"steps": step_count, "total_reward": total_reward, "done": done}

def get_session_id(request: Request):
    return request.headers.get("session-id", str(uuid.uuid4()))

def update_urdf_position(urdf_path, position, orientation):
    """Update position and orientation in a URDF file"""
    try:
        tree = ET.parse(urdf_path)
        root = tree.getroot()
        
        # Find the link element with visual/collision
        for link in root.findall(".//link"):
            # Update position in visual
            for visual in link.findall(".//visual/origin"):
                visual.set("xyz", f"{position[0]} {position[1]} {position[2]}")
                visual.set("rpy", f"{orientation[0]} {orientation[1]} {orientation[2]}")
            
            # Update position in collision
            for collision in link.findall(".//collision/origin"):
                collision.set("xyz", f"{position[0]} {position[1]} {position[2]}")
                collision.set("rpy", f"{orientation[0]} {orientation[1]} {orientation[2]}")
        
        tree.write(urdf_path)
        return True
    except Exception as e:
        print(f"Error updating URDF {urdf_path}: {e}")
        return False

@sio.event
async def connect(sid, environ):
    """Initialize session metadata when a client connects"""
    session_metadata[sid] = {
        "environment_objects": [],
        "agent": None
    }
    print(f"Client connected: {sid}")
    await sio.emit('connected', {'status': 'connected', 'session_id': sid}, to=sid)

@sio.event
async def disconnect(sid):
    """Clean up session metadata when a client disconnects"""
    if sid in session_metadata:
        del session_metadata[sid]
    print(f"Client disconnected: {sid}")

@app.post("/upload_filename")
async def upload_filename(payload: FilenamePayload, session_id: str = Depends(get_session_id)):
    """
    Upload a filename and find the corresponding .obj file.
    Adds the object to the session's environment objects.
    """
    if session_id not in session_metadata:
        session_metadata[session_id] = {"environment_objects": [], "agent": None}
    
    # Get base name without extension
    base_name = os.path.splitext(payload.filename)[0]
    obj_filename = f"{base_name}.obj"
    
    # Check if obj file exists
    obj_path = os.path.join(OBJ_DIR, obj_filename)
    if not os.path.exists(obj_path):
        return {"status": "error", "message": f"Object file {obj_filename} not found"}
    
    # Generate or find the corresponding URDF
    urdf_filename = f"{base_name}.urdf"
    urdf_path = os.path.join(URDF_DIR, urdf_filename)
    
    # If URDF doesn't exist, you might want to generate it
    # For now, assume it exists or return an error
    if not os.path.exists(urdf_path):
        return {"status": "error", "message": f"URDF file {urdf_filename} not found"}
    
    # Add to session's environment objects if not already there
    if obj_filename not in session_metadata[session_id]["environment_objects"]:
        session_metadata[session_id]["environment_objects"].append(obj_filename)
    
    return {
        "status": "success", 
        "message": "Filename received",
        "obj_file": obj_filename,
        "urdf_file": urdf_filename
    }

@app.post("/upload_position")
async def upload_position(payload: PositionPayload, session_id: str = Depends(get_session_id)):
    """
    Update the positions and orientations of multiple objects in their URDF files.
    """
    if session_id not in session_metadata:
        return {"status": "error", "message": "Session not found"}
    
    results = []
    
    for obj in payload.objects:
        # Get the base name without extension
        base_name = os.path.splitext(obj.filename)[0]
        urdf_filename = f"{base_name}.urdf"
        urdf_path = os.path.join(URDF_DIR, urdf_filename)
        
        if not os.path.exists(urdf_path):
            results.append({
                "filename": obj.filename,
                "status": "error",
                "message": f"URDF file {urdf_filename} not found"
            })
            continue
        
        # Update URDF with new position and orientation
        success = update_urdf_position(
            urdf_path=urdf_path,
            position=obj.position,
            orientation=obj.orientation
        )
        
        results.append({
            "filename": obj.filename,
            "status": "success" if success else "error",
            "message": "Position updated" if success else "Failed to update position"
        })
    
    return {"status": "success", "results": results}


def create_training_pod(pod_name, session_id):
    # Use in-cluster config if running within Kubernetes; otherwise, use config.load_kube_config()
    try:
        config.load_incluster_config()
    except Exception:
        config.load_kube_config()
        
    v1 = client.CoreV1Api()
    # Define the pod specification.
    pod = client.V1Pod(
        metadata=client.V1ObjectMeta(name=pod_name, labels={"app": "training"}),
        spec=client.V1PodSpec(
            containers=[
                client.V1Container(
                    name="training-container",
                    image="your-docker-registry/training:latest",
                    env=[client.V1EnvVar(name="SESSION_ID", value=session_id)],
                    ports=[client.V1ContainerPort(container_port=5000)]
                )
            ],
            restart_policy="Never"
        )
    )
    # Create the pod in the desired namespace (here, "default")
    v1.create_namespaced_pod(namespace="default", body=pod)

@app.post("/begin_training")
async def begin_training(session_id: str = Depends(get_session_id)):
    """
    Start the training process using all the environment objects in the session.
    """
    if session_id not in session_metadata:
        return {"status": "error", "message": "Session not found"}
    
    session = session_metadata[session_id]
    
    if not session["environment_objects"]:
        return {"status": "error", "message": "No environment objects configured"}
    
    print(f"Starting training with {len(session['environment_objects'])} objects")
    
    # Prepare URDF files and environment configuration
    urdf_files = []
    for obj_filename in session["environment_objects"]:
        base_name = os.path.splitext(obj_filename)[0]
        urdf_filename = f"{base_name}.urdf"
        urdf_path = os.path.join(URDF_DIR, urdf_filename)
        
        if os.path.exists(urdf_path):
            urdf_files.append(urdf_path)
    
    if not urdf_files:
        return {"status": "error", "message": "No valid URDF files found"}
    
    # Initialize the environment with the URDF files
    env = BulletEnv(urdf_files=urdf_files)
    
    # Create trainer and start training
    trainer = Trainer(env=env)
    result = trainer.train()
    
    # Clean up
    env.close()
    
    return {
        "status": "success", 
        "message": "Training completed",
        "training_result": result
    }

# Socket.IO event for live updates
@sio.event
async def update_live_position(sid, data):
    """
    Update object positions in real-time during simulation.
    """
    if sid not in session_metadata:
        return {"status": "error", "message": "Session not found"}
    
    if isinstance(data, dict) and "objects" in data:
        for obj in data["objects"]:
            filename = obj.get("filename")
            position = obj.get("position")
            orientation = obj.get("orientation")
            
            if filename and position and orientation:
                base_name = os.path.splitext(filename)[0]
                urdf_filename = f"{base_name}.urdf"
                urdf_path = os.path.join(URDF_DIR, urdf_filename)
                
                if os.path.exists(urdf_path):
                    update_urdf_position(urdf_path, position, orientation)
    
    # Optionally broadcast updated state to other clients
    await sio.emit("state_update", {"status": "position_updated"}, to=sid)

if __name__ == "__main__":
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
