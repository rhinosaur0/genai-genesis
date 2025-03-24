from gymnasium.envs.registration import register
import sys
import os

# Add the trainer-engine directory to the Python path so we can import from it
trainer_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'trainer-engine'))
if trainer_engine_dir not in sys.path:
    sys.path.append(trainer_engine_dir)

# Register the environment with Gymnasium
register(
    id='CustomBulletEnv-v0',
    entry_point='training_env.env_setup:MultiObjectBulletEnv',
    max_episode_steps=1000,
)
