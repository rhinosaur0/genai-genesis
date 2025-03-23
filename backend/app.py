from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from pybullet_env.env import BulletEnv
from fastapi.middleware.cors import CORSMiddleware
from pybullet_env.trainer import Trainer

import os
import xml.etree.ElementTree as ET
from kubernetes import client, config

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

# Pydantic models for input validation
class FilenamePayload(BaseModel):
    filename: str

class ObjectPositionPayload(BaseModel):
    filename: str
    position: List[float]
    orientation: List[float]

class PositionPayload(BaseModel):
    objects: List[ObjectPositionPayload]

# Path configurations
OBJ_DIR = os.path.join(os.getcwd(), "obj")
URDF_DIR = os.path.join(os.getcwd(), "urdf")

# Ensure directories exist
os.makedirs(OBJ_DIR, exist_ok=True)
os.makedirs(URDF_DIR, exist_ok=True)

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

@app.post("/upload_filename")
async def upload_filename(payload: FilenamePayload):
    """
    Upload a filename and find the corresponding .obj file.
    """
    return {
        "status": "success",
        "message": f"Filename {payload.filename} received"
    }

@app.post("/upload_position")
async def upload_position(payload: PositionPayload):
    """
    Update the positions and orientations of multiple objects in their URDF files.
    """
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
async def begin_training():
    """
    Start the training process using all the environment objects.
    """
    # Get all URDF files in the directory
    urdf_files = []
    for filename in os.listdir(URDF_DIR):
        if filename.endswith(".urdf"):
            urdf_path = os.path.join(URDF_DIR, filename)
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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
