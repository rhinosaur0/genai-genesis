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

# Helper to get local machine's IP address
def get_host_ip():
    try:
        # This creates a socket that doesn't actually connect anywhere
        # but allows us to get the machine's IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Connecting to a Google DNS server
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"  # Fallback to localhost

# Thread function for simulation management
def simulation_thread(sim_id, environment_id, ttl_seconds=3600):
    """Run a simulation for a specified time or until manually stopped."""
    try:
        # Initialize physics client in GUI mode with TCP
        physicsClientId = p.connect(p.GUI_SERVER)
        print(f"Started simulation {sim_id} with physics client ID: {physicsClientId}")

        # Get the port that PyBullet is using
        port = p.getConnectionInfo(physicsClientId)['port']
        
        # Setup simulation details
        active_simulations[sim_id]['status'] = 'running'
        active_simulations[sim_id]['physicsClientId'] = physicsClientId
        active_simulations[sim_id]['port'] = port
        active_simulations[sim_id]['ip'] = get_host_ip()

        # Load environment objects (similar to render_environment)
        environment_config = get_environment_config(environment_id)
        object_list = environment_config.get('objects', [])
        
        # Set up the scene
        p.setGravity(0, 0, -9.81)  # Set gravity
        
        # Load each object
        loaded_obj_ids = []
        for obj_info in object_list:
            obj_id = obj_info['id']
            try:
                # Download the object file from GCP
                object_path, _, file_type = download_from_gcp(obj_id)
                
                # Load the object with position/orientation if provided
                position = obj_info.get('position', [0, 0, 0])
                orientation = obj_info.get('orientation', [0, 0, 0, 1])
                
                if file_type == 'urdf':
                    pb_obj_id = p.loadURDF(object_path, position, orientation, physicsClientId=physicsClientId)
                elif file_type == 'sdf':
                    pb_obj_id = p.loadSDF(object_path, physicsClientId=physicsClientId)
                elif file_type == 'mjcf':
                    pb_obj_id = p.loadMJCF(object_path, physicsClientId=physicsClientId)
                elif file_type == 'obj':
                    visual_shape_id = p.createVisualShape(
                        shapeType=p.GEOM_MESH,
                        fileName=object_path,
                        physicsClientId=physicsClientId
                    )
                    pb_obj_id = p.createMultiBody(
                        baseMass=0,
                        basePosition=position,
                        baseOrientation=orientation,
                        baseVisualShapeIndex=visual_shape_id,
                        physicsClientId=physicsClientId
                    )
                else:
                    # Skip unsupported files
                    continue
                
                loaded_obj_ids.append(pb_obj_id)
                os.unlink(object_path)  # Clean up
                
            except Exception as e:
                print(f"Error loading object {obj_id}: {str(e)}")

        # Run the simulation for specified time or until stopped
        start_time = time.time()
        while (time.time() - start_time) < ttl_seconds and active_simulations.get(sim_id, {}).get('status') == 'running':
            p.stepSimulation(physicsClientId=physicsClientId)
            time.sleep(1/240.0)  # Small delay to not overload CPU (240 Hz is common for physics simulation)
        
        # Clean up when done
        if p.isConnected(physicsClientId):
            p.disconnect(physicsClientId)
        
        # Update status to completed if not already stopped
        if sim_id in active_simulations and active_simulations[sim_id]['status'] == 'running':
            active_simulations[sim_id]['status'] = 'completed'
            
    except Exception as e:
        print(f"Error in simulation {sim_id}: {str(e)}")
        if sim_id in active_simulations:
            active_simulations[sim_id]['status'] = 'error'
            active_simulations[sim_id]['error'] = str(e)
        
        # Make sure to disconnect
        if 'physicsClientId' in active_simulations.get(sim_id, {}) and p.isConnected(active_simulations[sim_id]['physicsClientId']):
            p.disconnect(active_simulations[sim_id]['physicsClientId'])

@app.route('/start_simulation', methods=['POST'])
def start_simulation():
    """
    Start a PyBullet simulation server that clients can connect to via TCP.
    
    Expected request format:
    {
        "environment_id": "env_123",
        "ttl_seconds": 3600  # Optional: Time-to-live for the simulation in seconds (default: 1 hour)
    }
    """
    request_data = request.get_json()
    environment_id = request_data.get('environment_id')
    
    if not environment_id:
        return jsonify({'error': 'Missing environment_id'}), 400
    
    ttl_seconds = request_data.get('ttl_seconds', 3600)  # Default: 1 hour
    
    # Generate a unique simulation ID
    sim_id = str(uuid.uuid4())
    
    try:
        # Register the new simulation
        active_simulations[sim_id] = {
            'environment_id': environment_id,
            'start_time': time.time(),
            'ttl_seconds': ttl_seconds,
            'status': 'initializing',
        }
        
        # Start the simulation in a new thread
        sim_thread = threading.Thread(
            target=simulation_thread,
            args=(sim_id, environment_id, ttl_seconds)
        )
        sim_thread.daemon = True  # Allow the thread to be terminated when the app exits
        sim_thread.start()
        
        # Wait briefly for the simulation to initialize
        max_wait = 10  # Maximum wait time in seconds
        wait_interval = 0.5  # Check interval in seconds
        waited = 0
        
        while (waited < max_wait and 
               (sim_id not in active_simulations or 
                'port' not in active_simulations[sim_id])):
            time.sleep(wait_interval)
            waited += wait_interval
        
        # Check if the simulation was properly initialized
        if (sim_id not in active_simulations or 
            active_simulations[sim_id].get('status') != 'running' or
            'port' not in active_simulations[sim_id]):
            
            # If there was an error during initialization
            error_msg = active_simulations.get(sim_id, {}).get('error', 'Simulation initialization timed out')
            return jsonify({
                'error': error_msg,
                'simulation_id': sim_id,
                'status': active_simulations.get(sim_id, {}).get('status', 'unknown')
            }), 500
        
        # Return the simulation details to the client
        response = {
            'simulation_id': sim_id,
            'environment_id': environment_id,
            'connection_info': {
                'ip': active_simulations[sim_id]['ip'],
                'port': active_simulations[sim_id]['port'],
                'protocol': 'tcp'
            },
            'ttl_seconds': ttl_seconds,
            'status': active_simulations[sim_id]['status'],
            'connection_string': f"pybullet.connect(pybullet.GUI, '{active_simulations[sim_id]['ip']}', {active_simulations[sim_id]['port']})"
        }
        
        return jsonify(response)
        
    except Exception as e:
        # Clean up if there was an error
        if sim_id in active_simulations:
            active_simulations[sim_id]['status'] = 'error'
            active_simulations[sim_id]['error'] = str(e)
        
        return jsonify({'error': str(e), 'simulation_id': sim_id}), 500

@app.route('/get_simulation_status/<sim_id>', methods=['GET'])
def get_simulation_status(sim_id):
    """Get the status of a running simulation."""
    if sim_id not in active_simulations:
        return jsonify({'error': 'Simulation not found'}), 404
    
    sim_info = active_simulations[sim_id].copy()
    
    # Compute elapsed time and remaining time
    current_time = time.time()
    elapsed_seconds = current_time - sim_info['start_time']
    remaining_seconds = max(0, sim_info['ttl_seconds'] - elapsed_seconds)
    
    # Add time information
    sim_info['elapsed_seconds'] = elapsed_seconds
    sim_info['remaining_seconds'] = remaining_seconds
    
    # Remove internal fields
    if 'physicsClientId' in sim_info:
        del sim_info['physicsClientId']
    
    return jsonify(sim_info)

@app.route('/stop_simulation/<sim_id>', methods=['POST'])
def stop_simulation(sim_id):
    """Stop a running simulation."""
    if sim_id not in active_simulations:
        return jsonify({'error': 'Simulation not found'}), 404
    
    try:
        # Mark the simulation for stopping
        active_simulations[sim_id]['status'] = 'stopping'
        
        # If we have the physics client ID, disconnect directly
        if 'physicsClientId' in active_simulations[sim_id] and p.isConnected(active_simulations[sim_id]['physicsClientId']):
            p.disconnect(active_simulations[sim_id]['physicsClientId'])
        
        # Update status
        active_simulations[sim_id]['status'] = 'stopped'
        
        return jsonify({
            'simulation_id': sim_id,
            'status': 'stopped'
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'simulation_id': sim_id}), 500

@app.route('/list_simulations', methods=['GET'])
def list_simulations():
    """List all active simulations."""
    # Filter out internal details and organize simulations
    sim_list = []
    for sim_id, sim_info in active_simulations.items():
        # Only include relevant fields
        filtered_info = {
            'simulation_id': sim_id,
            'environment_id': sim_info.get('environment_id'),
            'status': sim_info.get('status'),
            'start_time': sim_info.get('start_time'),
            'elapsed_seconds': time.time() - sim_info.get('start_time', time.time()),
            'remaining_seconds': max(0, sim_info.get('ttl_seconds', 0) - (time.time() - sim_info.get('start_time', time.time())))
        }
        
        # Add connection info if available
        if 'ip' in sim_info and 'port' in sim_info:
            filtered_info['connection_info'] = {
                'ip': sim_info['ip'],
                'port': sim_info['port']
            }
        
        sim_list.append(filtered_info)
    
    return jsonify({'simulations': sim_list})

@app.route('/get_environment', methods=['POST'])
def get_environment():
    """
    Load environment from GCP and return all object data including file content.
    
    Expected request format:
    {
        "environment_id": "env_123"
    }
    """
    request_data = request.get_json()
    environment_id = request_data.get('environment_id')
    
    if not environment_id:
        return jsonify({'error': 'Missing environment_id'}), 400
    
    try:
        # Get environment config (list of objects) from GCP
        environment_config = get_environment_config(environment_id)
        object_list = environment_config.get('objects', [])
        
        if not object_list:
            return jsonify({'error': 'No objects found for this environment'}), 404
        
        # Connect to PyBullet in headless mode
        p.connect(p.DIRECT)
        
        # Dictionary to store loaded objects and their info
        loaded_objects = {}
        
        # Load each object
        for obj_info in object_list:
            obj_id = obj_info['id']
            
            try:
                # Download the object file from GCP
                object_path, file_content, file_type = download_from_gcp(obj_id)
                
                # Load the object into PyBullet
                if file_type == 'urdf':
                    pb_obj_id = p.loadURDF(object_path)
                elif file_type == 'sdf':
                    pb_obj_id = p.loadSDF(object_path)
                elif file_type == 'mjcf':
                    pb_obj_id = p.loadMJCF(object_path)
                elif file_type == 'obj':
                    # For obj files we need visual shape id first
                    visual_shape_id = p.createVisualShape(
                        shapeType=p.GEOM_MESH,
                        fileName=object_path
                    )
                    pb_obj_id = p.createMultiBody(
                        baseMass=0,
                        baseVisualShapeIndex=visual_shape_id
                    )
                else:
                    # Skip unsupported files
                    continue
                    
                # Get position and orientation
                pos, orn = p.getBasePositionAndOrientation(pb_obj_id)
                
                # Get all visual data about the object
                visual_data = p.getVisualShapeData(pb_obj_id)
                
                # Store object info
                obj_data = {
                    'id': obj_id,
                    'position': [float(p) for p in pos],  # Convert numpy array to list for JSON
                    'orientation': [float(o) for o in orn],  # Convert numpy array to list for JSON
                    'file_content': file_content,
                    'file_type': file_type
                }
                
                # For articulated objects (like URDFs), add joint info
                num_joints = p.getNumJoints(pb_obj_id)
                if num_joints > 0:
                    joints = []
                    for j in range(num_joints):
                        joint_info = p.getJointInfo(pb_obj_id, j)
                        joint_state = p.getJointState(pb_obj_id, j)
                        joints.append({
                            'index': j,
                            'name': joint_info[1].decode('utf-8'),
                            'type': joint_info[2],
                            'position': float(joint_state[0]),
                            'velocity': float(joint_state[1])
                        })
                    obj_data['joints'] = joints
                
                loaded_objects[obj_id] = obj_data
                
                # Clean up the temp file
                os.unlink(object_path)
                
            except Exception as e:
                print(f"Error loading object {obj_id}: {str(e)}")
        
        # Disconnect from PyBullet
        p.disconnect()
        
        # Format response
        response = {
            'environment_id': environment_id,
            'objects': loaded_objects
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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