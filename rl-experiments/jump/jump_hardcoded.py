import time
import numpy as np
from jump_env import BlockJumpEnv

def actor(obs):
    """
    Actor function that determines the action based on observations
    
    obs[0:3] - robot position (x, y, z)
    obs[3:6] - robot velocity (vx, vy, vz)
    obs[6:9] - target position (x, y, z)
    """
    robot_x, robot_y, robot_z = obs[0], obs[1], obs[2]
    robot_vx, robot_vy, robot_vz = obs[3], obs[4], obs[5]
    target_x, target_y, target_z = obs[6], obs[7], obs[8]
    
    # Calculate horizontal distance to target
    distance_x = target_x - robot_x
    distance_y = target_y - robot_y
    
    # Calculate block top position (assuming block has height of 1.0)
    block_top_z = target_z + 0.4  # Adjust based on your block height
    
    # 1. If we're directly above the block, apply landing/stabilizing forces
    if abs(distance_x) < 0.3 and abs(distance_y) < 0.3 and robot_z > block_top_z - 0.5:
        # When we're above the block, apply downward force to stay on it
        # and counter horizontal velocity completely
        return np.array([-robot_vx * 2.0, -robot_vy * 2.0, -2.0])
    
    # 2. If we're almost on top of the block, stabilize gently
    if abs(distance_x) < 0.4 and abs(distance_y) < 0.4 and abs(robot_z - block_top_z) < 0.3:
        # Apply stronger dampening force to stabilize
        return np.array([-robot_vx * 3.0, -robot_vy * 3.0, -robot_vz * 2.0])
    
    # 3. If we're approaching but haven't jumped yet, prepare to jump
    if 0.5 < distance_x < 1.2 and abs(distance_y) < 0.5 and robot_z < 0.7:
        # Gentler jump with forward component
        jump_force_x = 4.0
        jump_force_z = 10.0
        return np.array([jump_force_x, 0, jump_force_z])
    
    # 4. If we're in the air and need to adjust
    if robot_z > 0.8:
        # If we're above and past the target, apply reverse thrust
        if robot_x > target_x:
            return np.array([-3.0, -robot_vy * 1.5, 0])
            
        # If we're approaching the target from above, start slowing down
        if distance_x < 1.0 and robot_z > block_top_z:
            adjustment_x = distance_x * 1.0  # Gentler approach
            adjustment_y = distance_y * 1.0
            return np.array([adjustment_x - robot_vx * 0.8, -robot_vy * 0.8, -1.0])
            
        # Normal in-air adjustment
        adjustment_x = distance_x * 1.5
        adjustment_y = distance_y * 1.5
        
        # Limit adjustments
        adjustment_x = np.clip(adjustment_x, -5.0, 5.0)
        adjustment_y = np.clip(adjustment_y, -5.0, 5.0)
        
        return np.array([adjustment_x, adjustment_y, 0])
    
    # 5. By default, move toward the block
    return np.array([5.0, 0, 0.0])

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
                if total_reward > 0:
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
    