import os
import gymnasium as gym
import pybullet_envs_gymnasium
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize, DummyVecEnv
from stable_baselines3.common.evaluation import evaluate_policy
from google.cloud import storage
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_from_gcs(bucket_name, source_blob_name, destination_file_name):
    """Downloads a file from GCS."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)
    logger.info(f"Downloaded {source_blob_name} to {destination_file_name}")

def upload_to_gcs(bucket_name, source_file_name, destination_blob_name):
    """Uploads a file to GCS."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(source_file_name)
    logger.info(f"Uploaded {source_file_name} to {destination_blob_name}")

log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)
stats_path = os.path.join(log_dir, "vec_normalize.pkl")

def train(env_id="HalfCheetahBulletEnv-v0"):
    # Environment setup using vectorized environment
    vec_env = make_vec_env(env_id, n_envs=4)
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

    # Make sure we have the bucket name
    if "BUCKET_NAME" not in os.environ:
        # raise ValueError("BUCKET_NAME environment variable must be set")
        bucket_name = "genai-genesis-storage"
    else:
        bucket_name = os.environ["BUCKET_NAME"]
        
    logger.info(f"Will save outputs to gs://{bucket_name}/test-train/")

    # Initialize the agent
    model = PPO("MlpPolicy",
                vec_env,
                verbose=1,
                tensorboard_log=os.path.join(log_dir, "tensorboard"))

    # Train the agent
    model.learn(total_timesteps=1000, tb_log_name="PPO_ant")

    # Save the model and normalization stats locally
    model_path = os.path.join(log_dir, "ppo_ant")
    model.save(model_path)
    vec_env.save(stats_path)

    try:
        # Upload model and stats to GCS under test-train directory
        upload_to_gcs(bucket_name, f"{model_path}.zip", "test-train/models/ant_agent_latest.zip")
        upload_to_gcs(bucket_name, stats_path, "test-train/models/vec_normalize.pkl")
    except Exception as e:
        logger.error(f"Failed to upload model and stats: {e}")
    
    try: 
        # Upload tensorboard logs under test-train directory
        for file in os.listdir(os.path.join(log_dir, "tensorboard")):
            source_path = os.path.join(log_dir, "tensorboard", file)
            if os.path.isfile(source_path):
                upload_to_gcs(bucket_name, source_path, f"test-train/logs/tensorboard/{file}")
    except Exception as e:
        logger.error(f"Failed to upload tensorboard logs: {e}")

    return model_path

if __name__ == "__main__":
    train()