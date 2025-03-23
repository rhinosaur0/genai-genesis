from gymnasium import spaces
import gymnasium as gym
import pybullet as p
import pybullet_data
import numpy as np
import time

from .detection import detect_collision
from .agent import AgentBall
from .env_object import GeneralObject 

class BulletEnv(gym.Env):
    """Custom Gym environment wrapping a PyBullet simulation."""
    metadata = {"render.modes": ["human", "rgb_array"]}

    def __init__(self, target_filename, target_position):
        super(BulletEnv, self).__init__()
        # Observation: agent and target positions (6 numbers)
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(6,), dtype=np.float32)
        # Dummy action space; actions are not manually controlled here.
        self.action_space = spaces.Discrete(1)
        self.target_filename = target_filename
        self.target_position = target_position

        # Connect to PyBullet in GUI mode (change to p.DIRECT for headless)
        self.physics_client = p.connect(p.GUI)
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

    def __init__(self, objects, agent):
        self.objects = objects  # List of GeneralObject instances
        self.agent = agent      # An AgentBall instance
        
        # Calculate observation space size: 3 values for agent position + 3 values per object
        obs_dim = 3 + (len(objects) * 3)
        
        self.observation_space = spaces.Box(
            low=-np.inf, 
            high=np.inf, 
            shape=(obs_dim,), 
            dtype=np.float32
        )
        
        self.action_space = spaces.Discrete(1)
        self.done = False
        self.physics_client = p.connect(p.GUI)
        p.setAdditionalSearchPath(pybullet_data.getDataPath())
        p.setGravity(0, 0, -9.81)
        self.plane_id = p.loadURDF("plane.urdf")
        self.agent.load()
        for obj in self.objects:
            obj.load()

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
        # Get agent position and orientation
        pos_agent, orn_agent = p.getBasePositionAndOrientation(self.agent.body_id)
        print(f'pos_agent: {pos_agent}')
        print(f'orn_agent: {orn_agent}')
        
        # Get positions of all objects
        obj_positions = []
        for obj in self.objects:
            pos_obj, orn_obj = p.getBasePositionAndOrientation(obj.body_id)
            obj_positions.extend(pos_obj)
            obj_positions.extend(orn_obj)  # Add the x, y, z coordinates
        
        # If no objects, return zeros
        if not obj_positions:
            obj_positions = [0, 0, 0]
        
        # Combine agent position with all object positions
        combined_obs = np.array(list(pos_agent) + list(orn_agent) + obj_positions, dtype=np.float32)
        
        return combined_obs

    def step(self, action):
        # For demonstration, steer the agent toward the first object.
        if self.objects:
            self.agent.set_velocity_toward(self.objects[0].position, speed=4.0)
        p.stepSimulation()
        
        obs = self._get_obs()
        print(obs)
        reward = 0.0
        for obj in self.objects:
            if detect_collision(self.agent.body_id, obj.body_id):
                reward = 1.0
                self.done = True
                break
        return obs, reward, self.done, {}