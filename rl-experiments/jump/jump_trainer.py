import os
import gymnasium as gym
import numpy as np

# Import your custom environment
from jump_env import BlockJumpEnv

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize
from stable_baselines3.common.evaluation import evaluate_policy
from gymnasium.envs.registration import register

# Register the environment
register(
    id='BlockJump-v0',
    entry_point='jump_env:BlockJumpEnv',
    max_episode_steps=200,
)

# Create logs directory
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(log_dir, exist_ok=True)
stats_path = os.path.join(log_dir, "block_jump_normalize.pkl")

def train(total_timesteps=200000):
    # Create vectorized environment
    vec_env = make_vec_env('BlockJump-v0', n_envs=4)
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
    
    # Initialize agent
    model = PPO(
        "MlpPolicy", 
        vec_env,
        verbose=1,
        learning_rate=3e-4,
        n_steps=2048, # Number of steps to run for each environment per update
        batch_size=64,
        n_epochs=10, # Number of times to reuse each collected batch of experience for training
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2
    )
    
    # Train the agent
    print("Starting training...")
    # Total timestep: total number of environment steps to run
    # total_training_updates = total_timesteps / (n_envs * n_steps)
    # experiences_per_update = n_envs * n_steps
    # times_each_experience_used = n_epochs
    model.learn(total_timesteps=total_timesteps, tb_log_name="PPO_block_jump")
    
    # Save the model and normalization stats
    model_path = os.path.join(log_dir, "ppo_block_jump")
    model.save(model_path)
    vec_env.save(stats_path)

    return model_path

def test_on_rendered(model_path=None, model=None, vec_env=None):
    # Load the agent if not provided
    if model is None:
        model = PPO.load(model_path)
        vec_env = make_vec_env("BlockJump-v0", n_envs=1)
        vec_env = VecNormalize.load(stats_path, vec_env)
        vec_env.training = False
        vec_env.norm_reward = False

    render_env = gym.make("BlockJump-v0", render_mode="human")

    obs, _ = render_env.reset()
    total_reward = 0
    for _ in range(1000):  # Run for 1000 steps
        # Since the environment isn't normalized, we need to normalize the observation
        normalized_obs = vec_env.normalize_obs(obs)
        action, _ = model.predict(normalized_obs, deterministic=True)
        obs, reward, terminated, truncated, _ = render_env.step(action)
        total_reward += reward
        
        if terminated or truncated:
            print(f"Episode finished with reward: {total_reward}")
            obs, _ = render_env.reset()
            total_reward = 0

    render_env.close()

if __name__ == "__main__":
    model_path = train(total_timesteps=2000)
    model_path = "../logs/ppo_block_jump"
    test_on_rendered(model_path)
