import os
import numpy as np
import gymnasium as gym
from gymnasium import spaces
import pybullet as p
import pybullet_data

class BlockJumpEnv(gym.Env):
    metadata = {'render.modes': ['human', 'rgb_array']}
    
    def __init__(self, render_mode=None):
        super().__init__()
        
        self.render_mode = render_mode
        
        # Initialize connection to physics server
        if render_mode == "human":
            self.client = p.connect(p.GUI)
        else:
            self.client = p.connect(p.DIRECT)
        
        # Configure physics client
        p.setAdditionalSearchPath(pybullet_data.getDataPath())
        p.setGravity(0, 0, -9.8)
        
        # Set up observation and action spaces
        # [robot_x, robot_y, robot_z, vel_x, vel_y, vel_z, target_x, target_y, target_z]
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(9,), dtype=np.float32)
        
        # Action: Force in x, y, z directions
        self.action_space = spaces.Box(low=-10, high=10, shape=(3,), dtype=np.float32)
        
        self.step_counter = 0
        self.max_episode_steps = 10000

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.step_counter = 0
        
        # Reset simulation
        p.resetSimulation()
        p.setGravity(0, 0, -9.8)
        
        # Load plane
        plane_id = p.loadURDF("plane.urdf")
        # reduce friction
        p.changeDynamics(plane_id, -1, lateralFriction=0.1)
        
        # Create robot (simple box)
        robot_start_pos = [0, 0, 0.5]
        self.robot_id = p.createCollisionShape(p.GEOM_BOX, halfExtents=[0.2, 0.2, 0.2])
        self.robot_body = p.createMultiBody(
            baseMass=1.0,
            baseCollisionShapeIndex=self.robot_id,
            basePosition=robot_start_pos,
        )
        p.changeDynamics(self.robot_body, -1, linearDamping=0.0, angularDamping=0.0)
        
        # Create target block
        block_pos = [2.0, 0, 0.5]  # Place block 2 meters ahead
        block_shape = p.createCollisionShape(p.GEOM_BOX, halfExtents=[0.4, 0.4, 0.4])
        self.block_id = p.createMultiBody(
            baseMass=0,  # Static object
            baseCollisionShapeIndex=block_shape,
            basePosition=block_pos,
        )
        
        # Store target position for reward calculation
        self.target_position = [block_pos[0], block_pos[1], block_pos[2] + 0.4]  # Top of block
        
        # Wait for physics to stabilize
        for _ in range(10):
            p.stepSimulation()
        
        # Get initial observation
        observation = self._get_observation()
        info = {}
        
        return observation, info

    def step(self, action):
        # Scale the action to have a stronger effect
        scaled_action = action * 2.0
        
        # Apply action (force to robot)
        p.applyExternalForce(
            objectUniqueId=self.robot_body,
            linkIndex=-1,  # -1 for base
            forceObj=[scaled_action[0], scaled_action[1], scaled_action[2]],
            posObj=[0, 0, 0],
            flags=p.WORLD_FRAME
        )
        
        # Step the simulation for each action the agent takes
        # Make physics more stable by stepping multiple times
        for _ in range(5):
            p.stepSimulation()
        
        # Get observation, calculate reward, check if done
        observation = self._get_observation()
        reward = self._compute_reward()
        self.step_counter += 1
        terminated = self._is_terminated()
        truncated = self.step_counter >= self.max_episode_steps
        info = {}
        
        return observation, reward, terminated, truncated, info

    def _get_observation(self):
        # Get robot state
        position, _ = p.getBasePositionAndOrientation(self.robot_body)
        linear_vel, _ = p.getBaseVelocity(self.robot_body)
        
        # Create observation vector
        observation = np.array([
            position[0], position[1], position[2],          # Robot position
            linear_vel[0], linear_vel[1], linear_vel[2],    # Robot velocity
            self.target_position[0], self.target_position[1], self.target_position[2]  # Target position
        ])
        
        return observation.astype(np.float32)

    def _compute_reward(self):
        robot_pos, _ = p.getBasePositionAndOrientation(self.robot_body)
        
        # Base reward: negative distance to target
        distance = np.sqrt(sum([(robot_pos[i] - self.target_position[i])**2 for i in range(3)]))
        reward = -0.1 * distance  # Small penalty for distance
        
        # Bonus for being on the block
        if (abs(robot_pos[0] - self.target_position[0]) < 0.5 and
            abs(robot_pos[1] - self.target_position[1]) < 0.5 and
            abs(robot_pos[2] - self.target_position[2]) < 0.3):
            reward += 10.0  # Big bonus for reaching the goal

        # Reward for contacting
        contact_points = p.getContactPoints(self.robot_body, self.block_id)
        if contact_points:
            reward += 1.0
        
        # Penalty for falling
        if robot_pos[2] < 0.1:
            reward -= 5.0

        # Penalty for jumping too high
        if robot_pos[2] > 5.0:
            reward -= 5.0
            
        return reward

    def _is_terminated(self):
        robot_pos, _ = p.getBasePositionAndOrientation(self.robot_body)
        
        # Terminate if robot falls off the plane
        if robot_pos[2] < 0.1:
            return True

        # Terminate if robot goes too high
        if robot_pos[2] > 3.0:
            return True
            
        # Terminate on success: robot is entirely on top of the block
        robot_pos, _ = p.getBasePositionAndOrientation(self.robot_body)
        block_top_z = self.target_position[2] - 0.5  # Height of block surface
        
        # Check if robot is within the bounds of the block surface
        robot_x, robot_y = robot_pos[0], robot_pos[1]
        block_x, block_y = self.target_position[0], self.target_position[1]
        
        # Block dimensions
        block_half_width = 0.4  # From block creation halfExtents
        robot_half_width = 0.2  # From robot creation halfExtents
        
        # Check if robot is entirely on top of block
        on_top = (
            abs(robot_x - block_x) + robot_half_width <= block_half_width and  # X bounds
            abs(robot_y - block_y) + robot_half_width <= block_half_width and  # Y bounds
            abs(robot_pos[2] - block_top_z - 0.2) < 0.1  # Z position (0.2 is robot height, 0.1 is tolerance)
        )
        
        # check contact
        contact_points = p.getContactPoints(self.robot_body, self.block_id)

        if on_top and contact_points:
            return True
    
        return False

    def close(self):
        p.disconnect()
