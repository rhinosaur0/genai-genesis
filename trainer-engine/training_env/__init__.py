from gymnasium.envs.registration import register

# Use absolute import path instead of relative (.env_setup)
register(
    id='CustomBulletEnv-v0',
    entry_point='training_env.env_setup:MultiObjectBulletEnv',
    max_episode_steps=200,
)

register(
    id='BlockJumpEnv-v0',
    entry_point='training_env.jump_env:BlockJumpEnv',
    max_episode_steps=200,
)
