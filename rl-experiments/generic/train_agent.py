import gymnasium as gym
import torch
from flask import Flask, jsonify

from stable_baselines3 import PPO
from stable_baselines3.common.evaluation import evaluate_policy

def train():
    env = gym.make('Ant-v4')

    policy_kwargs = dict(activation_fn=torch.nn.LeakyReLU, net_arch=[512, 512])
    model = PPO('MlpPolicy', env, learning_rate=0.0003, policy_kwargs=policy_kwargs, verbose=1)

    for i in range(8000):
        print("Training iteration", i)
        model.learn(total_timesteps=10000, tb_log_name="PPO_Ant")
        model.save("ppo_Ant")
        mean_reward, _ = evaluate_policy(model, model.get_env(), n_eval_episodes=5)

        if mean_reward >= 270:
            return jsonify({"message": "Agent trained", "mean_reward": mean_reward})

    return jsonify({"message": "Training completed but reward not reached", "mean_reward": mean_reward})


