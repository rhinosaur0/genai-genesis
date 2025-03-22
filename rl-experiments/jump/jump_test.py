import time
import numpy as np
from jump_env import BlockJumpEnv
import pybullet as p

def test_forward():
    """Test the environment by applying consistent forward force"""
    env = BlockJumpEnv(render_mode="human")
    obs, _ = env.reset()
    
    # Create a consistent forward action
    forward_action = np.array([0.0, 0.0, 10.0])  # Forward force + small upward force
    
    for i in range(10000):
        obs, reward, terminated, truncated, _ = env.step(forward_action)
        p.stepSimulation()
        
        if terminated or truncated:
            print(f"Episode ended with reward: {reward}")
            obs, _ = env.reset()

def test_jump():
    """Test the environment with periodic jumping"""
    env = BlockJumpEnv(render_mode="human")
    obs, _ = env.reset()
    
    for step in range(1000):
        if step % 10 == 0:  # Apply jump force every other 25 steps
            action = np.array([5.0, 0.0, 20.0])  # Forward + strong upward force
        else:
            action = np.array([10.0, 0.0, 0.0])   # Just forward force
            
        obs, reward, terminated, truncated, _ = env.step(action)
        
        if terminated or truncated:
            print(f"Episode ended with reward: {reward}")
            obs, _ = env.reset()
    
    env.close()

def test_jumping():
    """Test the environment with very clear jumping motion"""
    env = BlockJumpEnv(render_mode="human")
    obs, _ = env.reset()
    
    try:
        while True:
            # if directly above, stop
            if obs[2] > obs[8] + 0.1:
                action = np.array([1.0, 0.0, 0.0])
            else:
                # Apply a strong upward force with some forward component
                action = np.array([0.0, 0.0, 20.0])  # Max upward force (z-axis)
            
            # Apply the force
            obs, reward, terminated, truncated, _ = env.step(action)
            
            # Add delay to see movement clearly
            time.sleep(0.01)
            
            # Let it fall back down before jumping again
            for _ in range(50):
                zero_action = np.array([5.0, 0.0, 0.0])  # Just forward force, no jump
                obs, reward, terminated, truncated, _ = env.step(zero_action)
                time.sleep(0.01)
                
            if terminated or truncated:
                print(f"Episode ended with reward: {reward}")
                time.sleep(1.0)
                obs, _ = env.reset()
                break
            
    except KeyboardInterrupt:
        print("\nSimulation stopped by user")
    finally:
        env.close()

def view_env():
    """
    Let a human navigate around the environment, no interaction
    """
    env = BlockJumpEnv(render_mode="human")
    env.reset()
    
    try:
        while True:
            p.stepSimulation()
    except KeyboardInterrupt:
        env.close()
        return
    
if __name__ == "__main__":
    # test_env()
    # test_forward()
    test_jumping()
    # test_jump()
    # view_env()