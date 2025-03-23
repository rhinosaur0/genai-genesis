import os
import json
import tempfile
import base64
from flask import Flask, request, jsonify
import pybullet as p
import numpy as np
from google.cloud import storage
import time
import uuid
import threading
import socket
from xml.etree import ElementTree as ET
import glob

from pybullet_env.trainer import Trainer
from pybullet_env.env import MultiObjectBulletEnv
from pybullet_env.agent import AgentBall
from pybullet_env.env_object import GeneralObject

app = Flask(__name__)

# Initialize GCP storage client
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'your-bucket-name')

# Dictionary to keep track of active simulations
active_simulations = {}

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

def extract_urdf_data(env_name):
    """
    Scan the assets directory under the given environment name for URDF files.
    For each URDF file, extract the position and orientation (from the <origin> element
    under the link) and read the associated OBJ file data from the visual element.
    
    Returns a dictionary:
    {
        "file1.urdf": {
            "position": [x, y, z],
            "orientation": [r, p, y],
            "obj_file_data": <contents of the OBJ file as text>
        },
        ...
    }
    """
    data = {}
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
            # Look for an origin element that is a direct child of link (not under inertial/visual/collision).
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
            # Extract the mesh filename from visual element.
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
                        if os.path.exists(obj_path):
                            with open(obj_path, "r") as f:
                                obj_data = f.read()
            file_key = os.path.basename(urdf_file)
            data[file_key] = {
                "position": position,
                "orientation": orientation,
                "obj_file_data": obj_data
            }
        except Exception as e:
            print(f"Error processing {urdf_file}: {e}")
    return data

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
    agent = AgentBall(start_pos=[0, 0, 1], radius=0.2)
    # Build the environment with all objects.
    env = MultiObjectBulletEnv(objects=objects, agent=agent)
    # Create the trainer and start training.
    trainer = Trainer(env)
    training_result = trainer.train()
    # Optionally, render (if render() is implemented).
    env.render()
    return training_result

@app.route('/render_object', methods=['GET'])
def render_object_endpoint():
    """
    GET endpoint to render an environment based on the provided env_id.
    
    Query parameters:
    - env_id: Required. The ID of the environment to render.
    
    Returns:
    - JSON response with environment data or error
    """
    env_id = request.args.get('env_id')
    
    if not env_id:
        return jsonify({'error': 'Missing env_id parameter'}), 400
    
    try:
        # First render (download) the environment files
        local_dir = render_environment(env_id)
        
        # Extract the URDF data from the downloaded files
        urdf_data = extract_urdf_data(env_id)
        
        # Optionally start training process if needed
        # Commented out to avoid long-running processes in a request handler
        training_result = start_training_process(env_id)
        
        # Return the environment data
        response = {
            'environment_id': env_id,
            'status': 'success',
            'local_directory': local_dir,
            'urdf_data': urdf_data,
            'training_result': training_result
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e), 'environment_id': env_id}), 500

# Health check endpoint for Cloud Run
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    # This is used when running locally
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)
