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
        self.max_episode_steps = 2000
        
        # Debug flags
        self.debug_mode = False

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
        self.robot_id = p.createCollisionShape(p.GEOM_BOX, halfExtents=[0.1, 0.1, 0.1])
        self.robot_body = p.createMultiBody(
            baseMass=1.0,
            baseCollisionShapeIndex=self.robot_id,
            basePosition=robot_start_pos,
        )
        p.changeDynamics(self.robot_body, -1, linearDamping=0.0, angularDamping=0.0)
        
        # Load the table URDF with explicit upright orientation
        # Identity quaternion [0,0,0,1] means no rotation
        block_pos = [0.7, 0.2, 0.2]
        self.block_id = p.loadURDF("table.urdf",
              basePosition=block_pos,
              baseOrientation=[1.57, 0, 0, 1.57],  # Explicitly set upright orientation
              useFixedBase=True,
              globalScaling=0.4)
        
        # Get actual dimensions of the table using AABB
        aabb = p.getAABB(self.block_id)
        min_coords, max_coords = aabb
        
        # Calculate target position - center top of the table
        table_height = max_coords[2]
        table_center_x = (min_coords[0] + max_coords[0]) / 2
        table_center_y = (min_coords[1] + max_coords[1]) / 2
        
        self.target_position = [table_center_x, table_center_y, table_height]
        
        # Print table dimensions for debugging
        if self.render_mode == "human":
            print(f"Table dimensions: min={min_coords}, max={max_coords}")
            print(f"Target position: {self.target_position}")
        
        # Store table dimensions for checks
        self.table_dims = {
            'x_min': min_coords[0],
            'x_max': max_coords[0],
            'y_min': min_coords[1],
            'y_max': max_coords[1],
            'height': table_height
        }
        
        # Create debug visuals if in debug mode
        if self.debug_mode and self.render_mode == "human":
            # Mark the target position
            p.addUserDebugLine(
                [self.target_position[0]-0.1, self.target_position[1], self.target_position[2]],
                [self.target_position[0]+0.1, self.target_position[1], self.target_position[2]],
                [1, 0, 0], 2.0, 0.1
            )
            p.addUserDebugLine(
                [self.target_position[0], self.target_position[1]-0.1, self.target_position[2]],
                [self.target_position[0], self.target_position[1]+0.1, self.target_position[2]],
                [1, 0, 0], 2.0, 0.1
            )
            
            # Visualize table corners
            corners = [
                [min_coords[0], min_coords[1], max_coords[2]],  # Top corners
                [min_coords[0], max_coords[1], max_coords[2]],
                [max_coords[0], min_coords[1], max_coords[2]],
                [max_coords[0], max_coords[1], max_coords[2]]
            ]
            for corner in corners:
                p.addUserDebugLine(
                    [corner[0], corner[1], corner[2]],
                    [corner[0], corner[1], corner[2] + 0.1],
                    [0, 1, 0], 2.0, 0.1
                )
        
        # Enable debug mode to see the table dimensions
        self.debug_mode = True
        
        # Wait for physics to stabilize
        for _ in range(20):  # Increased from 10 to 20 for better stability
            p.stepSimulation()
        
        # Get initial observation
        observation = self._get_observation()
        info = {}
        
        return observation, info

    def step(self, action):
        # Scale the action to have a stronger effect
        scaled_action = action * 2.5  # Increased from 2.0 to 5.0 for more power
        
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
        
        # Check if robot is above the table surface
        is_above_table = (
            self.table_dims['x_min'] <= robot_pos[0] <= self.table_dims['x_max'] and
            self.table_dims['y_min'] <= robot_pos[1] <= self.table_dims['y_max'] and
            robot_pos[2] >= self.table_dims['height'] - 0.1  # Slightly below is ok
        )
        
        # Bonus for being on the table
        if is_above_table:
            reward += 5.0
            
            # Extra bonus for being close to center of table
            center_x = (self.table_dims['x_min'] + self.table_dims['x_max']) / 2
            center_y = (self.table_dims['y_min'] + self.table_dims['y_max']) / 2
            center_dist = np.sqrt((robot_pos[0] - center_x)**2 + (robot_pos[1] - center_y)**2)
            
            if center_dist < 0.2:
                reward += 2.0
        
        # Reward for contacting the table
        contact_points = p.getContactPoints(self.robot_body, self.block_id)
        if contact_points:
            reward += 0.5
        
        # Penalty for falling off
        if robot_pos[2] < 0.1:
            reward -= 5.0
            
        return reward

    def _is_terminated(self):
        robot_pos, _ = p.getBasePositionAndOrientation(self.robot_body)

        return False
        
        # Terminate if robot falls off the plane
        if robot_pos[2] < 0.1:
            return True

        # Terminate if robot goes too far
        if robot_pos[2] > 5.0 or abs(robot_pos[0]) > 5.0 or abs(robot_pos[1]) > 5.0:
            return True
        
        # Check if robot is above the table
        is_above_table = (
            self.table_dims['x_min'] <= robot_pos[0] <= self.table_dims['x_max'] and
            self.table_dims['y_min'] <= robot_pos[1] <= self.table_dims['y_max'] and
            abs(robot_pos[2] - self.table_dims['height'] - 0.1) < 0.3  # 0.1 is half height of robot
        )
        
        # Check contact with table
        contact_points = p.getContactPoints(self.robot_body, self.block_id)
        
        # Stable on table condition - must be relatively stationary
        _, vel = p.getBaseVelocity(self.robot_body)
        is_stable = np.linalg.norm(vel) < 0.2  # Increased threshold slightly
        
        # Only terminate on success if the robot has been in the environment for a while
        # and is stable on the table
        if is_above_table and contact_points and is_stable and self.step_counter > 50:
            return True
        
        return False

    def close(self):
        p.disconnect()
