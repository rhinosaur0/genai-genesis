

from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from pybullet_env.env import BulletEnv

app = FastAPI()

# Pydantic models for input validation.
class FilenamePayload(BaseModel):
    filename: str

class PositionPayload(BaseModel):
    x: float
    y: float
    z: float

# Global storage for the two inputs.
global_inputs = {
    "target_filename": "output_file.obj",
    "target_position": [2, 2, 2]
}

@app.post("/upload_filename")
def upload_filename(payload: FilenamePayload):
    global_inputs["target_filename"] = payload.filename
    return {"status": "Filename received."}

@app.post("/upload_position")
def upload_position(payload: PositionPayload):
    global_inputs["target_position"] = [payload.x, payload.y, payload.z]
    return {"status": "Position received."}


@app.post("/begin_training")
def begin_training():
    if global_inputs["target_filename"] is not None and global_inputs["target_position"] is not None:
        print("Both inputs received. Starting training...")
        train()
    return {"status": "Position received."}

def train():
    """Create the environment, run a training loop until reward=1 (collision detected), then exit."""
    env = BulletEnv(
        target_filename=global_inputs["target_filename"],
        target_position=global_inputs["target_position"]
    )
    obs = env.reset()
    done = False
    step_count = 0
    while not done:
        obs, reward, done, _ = env.step(action=0)
        step_count += 1
        if reward == 1:
            print(f"Collision detected at step {step_count}. Reward: {reward}")
            break
    env.close()
    print("Training finished. Exiting.")

if __name__ == "__main__":
    # Run FastAPI with uvicorn. In production, adjust host/port as needed.
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    begin_training()
