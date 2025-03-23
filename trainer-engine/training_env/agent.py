import numpy as np
import pybullet as p

class AgentBall:
    """The agent represented as a ball starting at the origin."""
    def __init__(self, radius=0.2, start_pos=[0,0,1]):
        self.radius = radius
        self.start_pos = start_pos
        self.body_id = None

    def load(self):
        collision_shape = p.createCollisionShape(p.GEOM_SPHERE, radius=self.radius)
        visual_shape = p.createVisualShape(p.GEOM_SPHERE, radius=self.radius, rgbaColor=[1, 0, 0, 1])
        self.body_id = p.createMultiBody(
            baseMass=1.0,
            baseCollisionShapeIndex=collision_shape,
            baseVisualShapeIndex=visual_shape,
            basePosition=self.start_pos,
            baseOrientation=p.getQuaternionFromEuler([0, 0, 0])
        )
        return self.body_id

    def set_velocity_toward(self, target_pos, speed=4.0):
        """Compute a horizontal velocity vector from current position to target and update the agent's velocity,
        preserving the vertical (z-axis) component."""
        pos, _ = p.getBasePositionAndOrientation(self.body_id)
        pos = np.array(pos)
        target = np.array(target_pos)
        direction = target - pos
        norm = np.linalg.norm(direction[:2])  # only consider x and y for horizontal movement
        
        # Get the current velocity so we can preserve the z component.
        current_vel, _ = p.getBaseVelocity(self.body_id)
        current_vel = list(current_vel)
        
        if norm > 1e-3:
            horizontal_dir = (direction[:2] / norm) * speed
            current_vel[0] = horizontal_dir[0]
            current_vel[1] = horizontal_dir[1]
        else:
            current_vel[0] = 0
            current_vel[1] = 0

        p.resetBaseVelocity(self.body_id, linearVelocity=current_vel)


