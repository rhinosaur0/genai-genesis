import time
import numpy as np
from jump_env import BlockJumpEnv

def actor(obs):
    """
    Simplified actor function that determines the action based on observations
    
    obs[0:3] - robot position (x, y, z)
    obs[3:6] - robot velocity (vx, vy, vz)
    obs[6:9] - target position (x, y, z)
    """
    robot_x, robot_y, robot_z = obs[0], obs[1], obs[2]
    robot_vx, robot_vy, robot_vz = obs[3], obs[4], obs[5]
    target_x, target_y, target_z = obs[6], obs[7], obs[8]
    
    # Calculate distance to target
    distance_x = target_x - robot_x
    distance_y = target_y - robot_y
    distance_z = target_z - robot_z
    
    # Horizontal distance to target
    horizontal_distance = np.sqrt(distance_x**2 + distance_y**2)
    
    # Calculate normalized direction vector to target (horizontal only)
    if horizontal_distance > 0.01:  # Avoid division by zero
        dir_x = distance_x / horizontal_distance
        dir_y = distance_y / horizontal_distance
    else:
        dir_x, dir_y = 0, 0
        
    # STATE 1: If we're on or above the table, stabilize
    if robot_z >= target_z - 0.1 and horizontal_distance < 0.3:
        # Apply dampening forces to stabilize
        fx = -robot_vx * 2.0
        fy = -robot_vy * 2.0
        fz = -robot_vz * 2.0 - 1.0  # Extra downward force to stay on table
        
        return np.array([fx, fy, fz])
    
    # STATE 2: If we're close and need to jump up
    if horizontal_distance < 0.8 and robot_z < target_z - 0.2:
        # Jump force proportional to height needed
        jump_force = max(5.0, (target_z - robot_z) * 10.0)
        
        # Add small horizontal nudge towards target
        fx = dir_x * 3.0
        fy = dir_y * 3.0
        
        return np.array([fx, fy, jump_force])
    
    # STATE 3: If we're in position to start the jump
    if 0.6 < horizontal_distance < 1.2 and robot_z < 0.7:
        # Calculate jump arc - need to estimate a good force based on distance
        jump_horizontal = horizontal_distance * 4.0  # Horizontal component
        jump_vertical = 8.0  # Vertical component
        
        return np.array([dir_x * jump_horizontal, dir_y * jump_horizontal, jump_vertical])
    
    # STATE 4: If we're in the air, make corrections
    if robot_z > 0.7:
        # Calculate corrective forces based on position and velocity
        fx = dir_x * 3.0 - robot_vx * 0.5  # Dampen excess velocity
        fy = dir_y * 3.0 - robot_vy * 0.5
        fz = 0  # Let gravity work
        
        # If we're above the target and still moving up, apply downward force
        if horizontal_distance < 0.3 and robot_vz > 0:
            fz = -2.0
            
        return np.array([fx, fy, fz])
    
    # STATE 5: Default - move toward the target
    # Simple proportional control to approach the target
    fx = dir_x * 5.0
    fy = dir_y * 5.0
    
    return np.array([fx, fy, 0.0])

def jump_agent():
    """Main function that creates the environment and runs the agent"""
    env = BlockJumpEnv(render_mode="human")
    obs, _ = env.reset()
    
    total_reward = 0
    steps = 0
    max_steps = 10000
    
    try:
        while steps < max_steps:
            # Get action from actor
            action = actor(obs)

            # Take step in environment
            obs, reward, terminated, truncated, _ = env.step(action)
            total_reward += reward
            steps += 1
            
            # Optional: add small delay for visualization
            time.sleep(0.01)
            
            if terminated or truncated:
                print(f"Episode ended after {steps} steps with reward: {total_reward}")
                if steps >= env.max_episode_steps:
                    print("Episode truncated (reached max steps)")
                elif total_reward > 0:
                    print("Success! Agent reached the target")
                else:
                    print("Failed to reach the target")
                break
                
    except KeyboardInterrupt:
        print("\nSimulation stopped by user")
    finally:
        env.close()
    
    return total_reward

if __name__ == "__main__":
    jump_agent()
