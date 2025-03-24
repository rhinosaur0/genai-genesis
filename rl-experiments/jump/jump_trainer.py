import os
import gymnasium as gym
import numpy as np

from jump_env import BlockJumpEnv

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.evaluation import evaluate_policy
from gymnasium.envs.registration import register
import argparse

# Register the environment
register(
    id='BlockJump-v0',
    entry_point='jump_env:BlockJumpEnv',
    max_episode_steps=1000,
)

# Create logs directory
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(log_dir, exist_ok=True)
stats_path = os.path.join(log_dir, "block_jump_normalize.pkl")

def train(checkpoint_path=None, total_timesteps=200000, n_steps=2048, batch_size=64, n_epochs=10, n_envs=4):
    """
    Parameters:
    - checkpoint_path: path to a saved model to continue training
    - total_timesteps: total number of environment steps to run
    - n_steps: number of steps to run for each environment per update
    - batch_size: number of experiences per update
    - n_epochs: number of times to reuse each collected batch of experience for training
    - n_envs: number of environments to run in parallel

    Note:
    - total_training_updates = total_timesteps / (n_envs * n_steps)
    - experiences_per_update = n_envs * n_steps
    - times_each_experience_used = n_epochs
    """
    # Create vectorized environment
    vec_env = make_vec_env('BlockJump-v0', n_envs=n_envs)
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
    
    if checkpoint_path:
        # Load existing model and normalization stats
        model = PPO.load(checkpoint_path, env=vec_env)
        vec_env = VecNormalize.load(stats_path, vec_env)
        print(f"Loaded checkpoint from {checkpoint_path}")
    else:
        # Initialize new agent
        model = PPO(
            "MlpPolicy", 
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            n_steps=n_steps,
            batch_size=batch_size,
            n_epochs=n_epochs,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2
        )
    
    # Train the agent
    print("Starting training...")
    model.learn(total_timesteps=total_timesteps, tb_log_name="PPO_block_jump")
    
    # Save the model and normalization stats
    model_path = os.path.join(log_dir, "ppo_block_jump")
    model.save(model_path)
    vec_env.save(stats_path)

    return model_path

def test_on_rendered(model_path=None, model=None):
    """
    Create a render-enabled environment and test the agent on it.
    Uses vectorized environment for training, but a single environment for rendering.
    """
    # First, create a render-enabled environment
    render_env = gym.make("BlockJump-v0", render_mode="human")
    
    # Wrap it in a DummyVecEnv (needed for VecNormalize)
    vec_render_env = DummyVecEnv([lambda: render_env])
    
    # Apply normalization to the vector env containing our render env
    if model is None:
        model = PPO.load(model_path)
        vec_norm_env = VecNormalize.load(stats_path, vec_render_env)
    else:
        # Create a new VecNormalize with the same normalization stats as the training one
        original_vec_env = make_vec_env("BlockJump-v0", n_envs=1)
        original_vec_norm_env = VecNormalize.load(stats_path, original_vec_env)
        
        # Copy normalization statistics to our rendering environment
        vec_norm_env = VecNormalize(vec_render_env,
                                   norm_obs=original_vec_norm_env.norm_obs,
                                   norm_reward=False,
                                   clip_obs=original_vec_norm_env.clip_obs,
                                   gamma=original_vec_norm_env.gamma,
                                   epsilon=original_vec_norm_env.epsilon)
        
        # Copy actual statistics
        vec_norm_env.obs_rms = original_vec_norm_env.obs_rms
        
    vec_norm_env.training = False
    vec_norm_env.norm_reward = False
    
    # Now we can use the normalized vec env directly with rendering
    obs = vec_norm_env.reset()
    total_reward = 0
    for _ in range(2000):  # Run for 1000 steps
        action, _ = model.predict(obs, deterministic=True)
        obs, rewards, dones, infos = vec_norm_env.step(action)
        total_reward += rewards[0]  # rewards is a numpy array with one entry
        
        if dones[0]:
            print(f"Episode finished with reward: {total_reward}")
            obs = vec_norm_env.reset()
            total_reward = 0

    vec_norm_env.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true", help="Train the agent")
    parser.add_argument("--test", action="store_true", help="Test the agent")
    args = parser.parse_args()

    if args.train:
        train(
            total_timesteps=100000,
            batch_size=256,
            n_epochs=10,
            n_steps=2048,
            n_envs=4)
    elif args.test:
        test_on_rendered("../logs/ppo_block_jump")
