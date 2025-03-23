import pybullet as p

def detect_collision(body_a, body_b, distance_threshold=0.0):
    """Return True if a collision (contact point) exists between the two bodies."""
    contacts = p.getClosestPoints(bodyA=body_a, bodyB=body_b, distance=distance_threshold)
    return len(contacts) > 0