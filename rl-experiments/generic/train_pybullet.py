import os
import gymnasium as gym

# Register pybullet envs
import pybullet_envs_gymnasium

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize, DummyVecEnv
from stable_baselines3.common.evaluation import evaluate_policy

# Create logs directory in the project
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
# Make sure the directory exists
os.makedirs(log_dir, exist_ok=True)
stats_path = os.path.join(log_dir, "vec_normalize.pkl")

def train(env_id="HalfCheetahBulletEnv-v0"):
    vec_env = make_vec_env(env_id, n_envs=4)

    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

    model = PPO("MlpPolicy", vec_env, verbose=1)
    # Increase timesteps for longer training
    model.learn(total_timesteps=100000, tb_log_name=os.path.join(log_dir, "PPO_halfcheetah"))

    # Don't forget to save the VecNormalize statistics when saving the agent
    model_path = os.path.join(log_dir, "ppo_halfcheetah")
    print(model_path)
    model.save(model_path)
    vec_env.save(stats_path)
    
    return model_path

def test_on_vector_env(model_path):
    # Load the agent
    model = PPO.load(model_path)

    # Load the saved statistics
    vec_env = make_vec_env("HalfCheetahBulletEnv-v0", n_envs=1,)
    vec_env = VecNormalize.load(stats_path, vec_env)
    #  do not update them at test time
    vec_env.training = False
    # reward normalization is not needed at test time
    vec_env.norm_reward = False

    mean_reward, std_reward = evaluate_policy(model, vec_env)

    print(f"Mean reward = {mean_reward:.2f} +/- {std_reward:.2f}")
    
    return model, vec_env

def test_on_rendered(model_path=None, model=None, vec_env=None):
    # Load the agent if not provided
    if model is None:
        model = PPO.load(model_path)
        # Load the saved statistics
        vec_env = make_vec_env("HalfCheetahBulletEnv-v0", n_envs=1,)
        vec_env = VecNormalize.load(stats_path, vec_env)
        #  do not update them at test time
        vec_env.training = False
        # reward normalization is not needed at test time
        vec_env.norm_reward = False

    # Create a separate environment for rendering
    render_env = gym.make("HalfCheetahBulletEnv-v0", render_mode="human")
    
    # Test the agent with rendering
    obs, _ = render_env.reset()
    total_reward = 0
    for _ in range(1000):  # Run for 1000 steps
        # Since the environment isn't normalized, we need to normalize the observation
        normalized_obs = vec_env.normalize_obs(obs)
        action, _ = model.predict(normalized_obs, deterministic=True)
        obs, reward, terminated, truncated, info = render_env.step(action)
        total_reward += reward
        
        if terminated or truncated:
            print(f"Episode finished with reward: {total_reward}")
            obs, _ = render_env.reset()
            total_reward = 0

    render_env.close()

if __name__ == "__main__":
    # Train and get the model path
    # model_path = train()
    
    # Test on vector env
    # model, vec_env = test_on_vector_env(model_path)
    
    # Test with rendering
    # test_on_rendered(model=model, vec_env=vec_env)
    test_on_rendered(model_path="../logs/ppo_halfcheetah.zip")