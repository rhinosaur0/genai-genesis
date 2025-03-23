import os
import logging
from .env_setup import MultiObjectBulletEnv, BulletEnv
import numpy as np
from stable_baselines3 import PPO
from gymnasium.envs.registration import register
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize
from stable_baselines3.common.callbacks import BaseCallback
# from google.cloud import storage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrainingProgressCallback(BaseCallback):
    """Custom callback for yielding training progress."""
    
    def __init__(self, verbose=0):
        super(TrainingProgressCallback, self).__init__(verbose)
        self.training_env = None
        self.step_data = None
        self.total_reward = 0
    
    def _on_step(self) -> bool:
        # Get agent info if available
        if self.training_env is not None:
            observation = self.training_env.get_original_obs()
            
            # Assuming first three values of observation are agent position
            position = observation[0][:3] if len(observation[0]) >= 3 else [0, 0, 0]
            
            # Get the latest reward
            reward = self.locals.get('rewards', [0])[0]
            self.total_reward += reward
            
            self.step_data = {
                "position": position.tolist() if isinstance(position, np.ndarray) else list(position),
                "reward": float(reward),
                "total_reward": float(self.total_reward)
            }
        
        return True
    
    def get_step_data(self):
        """Returns the current step data."""
        return self.step_data

class Trainer:
    """Trainer class to train a PPO agent on a custom environment."""
    def __init__(self, env=None, env_id="CustomBulletEnv-v0", n_envs=1, total_timesteps=1000):
        self.env_id = env_id
        self.n_envs = n_envs
        self.total_timesteps = total_timesteps
        self.custom_env = env  # Store custom environment if provided
        self.total_reward = 0
        
        # Setup directories
        self.log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(self.log_dir, exist_ok=True)
        self.stats_path = os.path.join(self.log_dir, "vec_normalize.pkl")
        
        # Get bucket name from environment variable or use default
        if "BUCKET_NAME" not in os.environ:
            self.bucket_name = "genai-genesis-storage"
        else:
            self.bucket_name = os.environ["BUCKET_NAME"]
        
        logger.info(f"Will save outputs to gs://{self.bucket_name}/test-train/")
    
    # def upload_to_gcs(self, source_file_name, destination_blob_name):
    #     """Uploads a file to GCS."""
    #     try:
    #         storage_client = storage.Client()
    #         bucket = storage_client.bucket(self.bucket_name)
    #         blob = bucket.blob(destination_blob_name)
    #         blob.upload_from_filename(source_file_name)
    #         logger.info(f"Uploaded {source_file_name} to {destination_blob_name}")
    #     except Exception as e:
    #         logger.error(f"Failed to upload file: {e}")
    
    def train(self):
        # Environment setup using vectorized environment
        vec_env = make_vec_env(self.env_id, n_envs=self.n_envs)
        vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

        # Initialize the agent
        model = PPO("MlpPolicy",
                    vec_env,
                    verbose=1,
                    tensorboard_log=os.path.join(self.log_dir, "tensorboard"))

        # Train the agent
        model.learn(total_timesteps=self.total_timesteps, tb_log_name="PPO_agent")

        # Save the model and normalization stats locally
        model_path = os.path.join(self.log_dir, "ppo_agent")
        model.save(model_path)
        vec_env.save(self.stats_path)

        # try:
        #     # Upload model and stats to GCS under test-train directory
        #     self.upload_to_gcs(f"{model_path}.zip", "test-train/models/ppo_agent_latest.zip")
        #     self.upload_to_gcs(self.stats_path, "test-train/models/vec_normalize.pkl")
        # except Exception as e:
        #     logger.error(f"Failed to upload model and stats: {e}")
        
        # try: 
        #     # Upload tensorboard logs under test-train directory
        #     for file in os.listdir(os.path.join(self.log_dir, "tensorboard")):
        #         source_path = os.path.join(self.log_dir, "tensorboard", file)
        #         if os.path.isfile(source_path):
        #             self.upload_to_gcs(source_path, f"test-train/logs/tensorboard/{file}")
        # except Exception as e:
        #     logger.error(f"Failed to upload tensorboard logs: {e}")

        return model_path

    def get_total_reward(self):
        """Returns the total reward accumulated during training."""
        return self.total_reward
    
    def train_with_updates(self):
        """Train the agent and yield step information for progress updates."""
        # Setup environment - either use provided custom env or create a new vec_env
        if self.custom_env:
            # Wrapping custom env in VecNormalize
            from stable_baselines3.common.vec_env import DummyVecEnv
            vec_env = DummyVecEnv([lambda: self.custom_env])
            vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
        else:
            # Default vectorized environment setup
            vec_env = make_vec_env(self.env_id, n_envs=self.n_envs)
            vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

        # Initialize the agent
        model = PPO("MlpPolicy",
                    vec_env,
                    verbose=1,
                    tensorboard_log=os.path.join(self.log_dir, "tensorboard"))

        # Setup custom callback for training progress
        progress_callback = TrainingProgressCallback()
        progress_callback.training_env = vec_env
        
        # Train in smaller chunks to yield progress updates
        update_freq = max(1, self.total_timesteps // 100)  # Yield ~100 updates
        remaining_steps = self.total_timesteps
        
        while remaining_steps > 0:
            steps_this_iter = min(update_freq, remaining_steps)
            model.learn(total_timesteps=steps_this_iter, 
                        callback=progress_callback, 
                        reset_num_timesteps=False,
                        tb_log_name="PPO_agent")
            
            remaining_steps -= steps_this_iter
            step_data = progress_callback.get_step_data()
            if step_data:
                self.total_reward = step_data.get("total_reward", 0)
                yield step_data
        
        # Save the model and normalization stats locally
        model_path = os.path.join(self.log_dir, "ppo_agent")
        model.save(model_path)
        vec_env.save(self.stats_path)

        # try:
        #     # Upload model and stats to GCS under test-train directory
        #     self.upload_to_gcs(f"{model_path}.zip", "test-train/models/ppo_agent_latest.zip")
        #     self.upload_to_gcs(self.stats_path, "test-train/models/vec_normalize.pkl")
        # except Exception as e:
        #     logger.error(f"Failed to upload model and stats: {e}")
        
        # try: 
        #     # Upload tensorboard logs under test-train directory
        #     for file in os.listdir(os.path.join(self.log_dir, "tensorboard")):
        #         source_path = os.path.join(self.log_dir, "tensorboard", file)
        #         if os.path.isfile(source_path):
        #             self.upload_to_gcs(source_path, f"test-train/logs/tensorboard/{file}")
        # except Exception as e:
        #     logger.error(f"Failed to upload tensorboard logs: {e}")
        
        # Final yield with completion status
        yield {
            "status": "complete",
            "total_reward": float(self.total_reward),
            "message": "Training completed successfully"
        }
