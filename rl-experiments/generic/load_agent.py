import gymnasium as gym
import torch

from stable_baselines3 import PPO
from stable_baselines3.common.evaluation import evaluate_policy

# Create environment
# env = gym.make('LunarLanderContinuous-v2')

# env = gym.make('BipedalWalker-v3')
env = gym.make('Ant-v4', render_mode="human")
# env.render(mode="human")

policy_kwargs = dict(activation_fn=torch.nn.LeakyReLU, net_arch=[512, 512])
# Instantiate the agent
model = PPO('MlpPolicy', env,learning_rate=0.0003,policy_kwargs=policy_kwargs, verbose=1)

del model  # delete trained model to demonstrate loading
# Load the trained agent
model = PPO.load("../model/ppo_Ant")

# # Evaluate the agent
# mean_reward, std_reward = evaluate_policy(model, model.get_env(), n_eval_episodes=10)

# Enjoy trained agent
obs, _ = env.reset()
for i in range(100):
    terminated, truncated = False, False
    game_score = 0
    steps = 0
    while not terminated or truncated:
        action, _states = model.predict(obs, deterministic=True)
        obs, rewards, terminated, truncated, info = env.step(action)
        # import ipdb;ipdb.set_trace()
        game_score+=rewards
        steps+=1
        env.render()
    print("game ", i ," steps   ",steps, " game score %.3f"%game_score)
    obs, _ = env.reset()
    # break