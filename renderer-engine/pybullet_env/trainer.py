class Trainer:
    def __init__(self, env, max_steps=1000):
        self.env = env
        self.max_steps = max_steps
    
    def train(self):
        obs = self.env.reset()
        done = False
        step_count = 0
        total_reward = 0
        
        while not done and step_count < self.max_steps:
            # For now using a simple action (0), this would be replaced with your agent's policy
            action = 0  
            obs, reward, done, info = self.env.step(action)
            total_reward += reward
            step_count += 1
            
            if reward == 1:
                print(f"Collision detected at step {step_count}. Reward: {reward}")
                break
        
        print(f"Training finished after {step_count} steps. Total reward: {total_reward}")
        return {"steps": step_count, "total_reward": total_reward, "done": done}