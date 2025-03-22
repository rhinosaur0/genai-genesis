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
        time.sleep(1/2400)
        obs = self._get_obs()
        reward = 0.0
        if detect_collision(self.agent.body_id, self.target_object.body_id):
            reward = 1.0
            self.done = True

        user_input = input("Press 'c' to capture state, or just press Enter to continue: ")
        if user_input.lower() == "c":
            self.target_object.save_positions_to_urdf("target_object.urdf")
        return obs, reward, self.done, {}

    def render(self, mode="human"):
        # Rendering is handled via the PyBullet GUI.
        pass

    def close(self):
        p.disconnect(self.physics_client)