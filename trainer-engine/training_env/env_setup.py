from gymnasium import spaces
import gymnasium as gym
import pybullet as p
import pybullet_data
import numpy as np
import time
import xml.etree.ElementTree as ET
import os

from .detection import detect_collision
from .agent import AgentBall

class GeneralObject:
    """A general object loaded from a mesh file."""
    def __init__(self, filename: str, position: list, scale=[1,1,1]):
        self.filename = filename
        self.position = position  # Expected to be a list [x, y, z]
        self.scale = scale
        self.body_id = None

    def load(self):
        """Load the mesh object as a collision and visual shape."""
        # Construct the full path to the obj file in the assets directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        obj_path = os.path.join(base_dir, "assets", self.filename)
        
        # Print the path for debugging
        print(f"Loading mesh from: {obj_path}")
        
        # Check if the file exists
        if not os.path.exists(obj_path):
            raise FileNotFoundError(f"Could not find model file at {obj_path}")
            
        collision_shape = p.createCollisionShape(
            shapeType=p.GEOM_MESH,
            fileName=obj_path,
            meshScale=self.scale
        )
        visual_shape = p.createVisualShape(
            shapeType=p.GEOM_MESH,
            fileName=obj_path,
            meshScale=self.scale,
            rgbaColor=[0, 1, 0, 1]  # Green color
        )
        self.body_id = p.createMultiBody(
            baseMass=1.0,
            baseCollisionShapeIndex=collision_shape,
            baseVisualShapeIndex=visual_shape,
            basePosition=self.position,
            baseOrientation=p.getQuaternionFromEuler([0, 0, 0])
        )
        return self.body_id
    
    # Create the root element of the URDF
    def save_positions_to_urdf(self, filename="snapshot.urdf", mesh_filename="output.obj"):
        """
        Save a URDF snapshot of a single body.
        The URDF includes a link with its current origin (position and orientation)
        and a visual element that references a mesh file (e.g., output.obj).
        A matching collision element is also added.
        """
        # Get the current position and orientation (as quaternion) of the body.
        pos, orn = p.getBasePositionAndOrientation(self.body_id)
        # Convert quaternion to Euler angles (roll, pitch, yaw)
        rpy = p.getEulerFromQuaternion(orn)
        
        # Create the root <robot> element.
        robot = ET.Element("robot", attrib={"name": "snapshot_robot"})
        
        # Create a <link> element representing the body.
        link = ET.SubElement(robot, "link", attrib={"name": "body_0"})
        
        # Add inertial data (minimal, to avoid warnings).
        inertial = ET.SubElement(link, "inertial")
        inertial_origin = ET.SubElement(inertial, "origin")
        inertial_origin.set("xyz", "0 0 0")
        inertial_origin.set("rpy", "0 0 0")
        mass_elem = ET.SubElement(inertial, "mass")
        mass_elem.set("value", "1")
        inertia_elem = ET.SubElement(inertial, "inertia")
        inertia_elem.set("ixx", "1")
        inertia_elem.set("ixy", "0")
        inertia_elem.set("ixz", "0")
        inertia_elem.set("iyy", "1")
        inertia_elem.set("iyz", "0")
        inertia_elem.set("izz", "1")
        
        # Set the link's origin to the current pose.
        origin = ET.SubElement(link, "origin")
        origin.set("xyz", f"{pos[0]} {pos[1]} {pos[2]}")
        origin.set("rpy", f"{rpy[0]} {rpy[1]} {rpy[2]}")
        
        # Use the absolute path for the mesh file.
        
        # Add a <visual> element referencing the mesh.
        visual = ET.SubElement(link, "visual")
        visual_origin = ET.SubElement(visual, "origin")
        visual_origin.set("xyz", "0 0 0")
        visual_origin.set("rpy", "0 0 0")
        visual_geometry = ET.SubElement(visual, "geometry")
        ET.SubElement(visual_geometry, "mesh", attrib={"filename": 'output.obj'})
        
        # Add a <collision> element using the same mesh.
        collision = ET.SubElement(link, "collision")
        collision_origin = ET.SubElement(collision, "origin")
        collision_origin.set("xyz", "0 0 0")
        collision_origin.set("rpy", "0 0 0")
        collision_geometry = ET.SubElement(collision, "geometry")
        ET.SubElement(collision_geometry, "mesh", attrib={"filename": 'output.obj'})
        
        # Write the XML tree to file.
        tree = ET.ElementTree(robot)
        tree.write(filename)
        print(f"URDF snapshot saved to {filename}")

class BulletEnv(gym.Env):
    """Custom Gym environment wrapping a PyBullet simulation."""
    metadata = {"render.modes": ["human", "rgb_array"]}

    def __init__(self, target_filename, target_position, render_mode=None):
        super(BulletEnv, self).__init__()
        # Observation: agent and target positions (6 numbers)
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(6,), dtype=np.float32)
        # Dummy action space; actions are not manually controlled here.
        self.action_space = spaces.Discrete(1)
        self.target_filename = target_filename
        self.target_position = target_position

        # Connect to PyBullet in GUI mode (change to p.DIRECT for headless)
        if render_mode == "human":
            self.physics_client = p.connect(p.GUI)
        else:
            self.physics_client = p.connect(p.DIRECT)
        
        p.setAdditionalSearchPath(pybullet_data.getDataPath())
        p.setGravity(0, 0, -9.81)

        # Load a plane as the ground
        self.plane_id = p.loadURDF("plane.urdf")

        # Create our agent (ball) and target object
        self.agent = AgentBall(radius=0.2, start_pos=[0, 0, 1])
        self.agent.load()

        self.target_object = GeneralObject(filename=self.target_filename, position=self.target_position)
        self.target_object.load()

        self.done = False

    def reset(self):
        # Reset simulation by reloading agent and target.
        p.resetSimulation()
        p.setGravity(0, 0, -9.81)
        p.loadURDF("plane.urdf")
        self.agent.load()
        self.target_object.load()
        self.done = False
        return self._get_obs()

    def _get_obs(self):
        pos_agent, _ = p.getBasePositionAndOrientation(self.agent.body_id)
        pos_target, _ = p.getBasePositionAndOrientation(self.target_object.body_id)
        return np.array(list(pos_agent) + list(pos_target), dtype=np.float32)

    def step(self, action):
        # Auto-steer agent toward target.
        self.agent.set_velocity_toward(self.target_object.position, speed=4.0)
        p.stepSimulation()
        time.sleep(1/20)
        obs = self._get_obs()
        reward = 0.0
        if detect_collision(self.agent.body_id, self.target_object.body_id):
            reward = 1.0
            self.done = True

        return obs, reward, self.done, {}

    def render(self, mode="human"):
        # Rendering is handled via the PyBullet GUI.
        pass

    def close(self):
        p.disconnect(self.physics_client)

class MultiObjectBulletEnv(gym.Env):
    """Custom Gym environment that loads multiple GeneralObject instances and an agent."""
    metadata = {"render.modes": ["human", "rgb_array"]}

    def __init__(self, objects=None, agent=None, render_mode=None):
        # Initialize with default values if not provided
        if agent is None:
            self.agent = AgentBall(radius=0.2, start_pos=[0, 0, 1])
        else:
            self.agent = agent
            
        self.objects = objects
            
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(6,), dtype=np.float32)
        self.action_space = spaces.Discrete(1)
        self.done = False
        
        # Connect to PyBullet
        if render_mode == "human":
            self.physics_client = p.connect(p.GUI)
        else:
            self.physics_client = p.connect(p.DIRECT)
            
        p.setAdditionalSearchPath(pybullet_data.getDataPath())
        p.setGravity(0, 0, -9.81)
        self.plane_id = p.loadURDF("plane.urdf")
        
        # Load the agent and objects
        self.agent.load()
        for obj in self.objects:
            obj.load()

    def set_object_and_agent(self, objects, agent):
        self.objects = objects
        self.agent = agent

    def reset(self):
        p.resetSimulation()
        p.setGravity(0, 0, -9.81)
        p.loadURDF("plane.urdf")
        self.agent.load()
        for obj in self.objects:
            obj.load()
        self.done = False
        return self._get_obs()

    def _get_obs(self):
        pos_agent, _ = p.getBasePositionAndOrientation(self.agent.body_id)
        # For simplicity, we return agent position and the position of the first object.
        if self.objects:
            pos_obj, _ = p.getBasePositionAndOrientation(self.objects[0].body_id)
        else:
            pos_obj = [0, 0, 0]
        return np.array(list(pos_agent) + list(pos_obj), dtype=np.float32)

    def step(self, action):
        # For demonstration, steer the agent toward the first object.
        if self.objects:
            self.agent.set_velocity_toward(self.objects[0].position, speed=4.0)
        p.stepSimulation()
        time.sleep(1/20)
        obs = self._get_obs()
        reward = 0.0
        for obj in self.objects:
            if detect_collision(self.agent.body_id, obj.body_id):
                reward = 1.0
                self.done = True
                break
        return obs, reward, self.done, {}
