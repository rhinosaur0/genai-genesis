import pybullet as p


class GeneralObject:
    """A general object loaded from a mesh file."""
    def __init__(self, filename: str, position: list, scale=[1,1,1]):
        self.filename = filename
        self.position = position  # Expected to be a list [x, y, z]
        self.scale = scale
        self.body_id = None

    def load(self):
        """Load the mesh object as a collision and visual shape."""
        collision_shape = p.createCollisionShape(
            shapeType=p.GEOM_MESH,
            fileName=self.filename,
            meshScale=self.scale
        )
        visual_shape = p.createVisualShape(
            shapeType=p.GEOM_MESH,
            fileName=self.filename,
            meshScale=self.scale,
            rgbaColor=[0, 1, 0, 1]  # Green color
        )
        self.body_id = p.createMultiBody(
            baseMass=1.0,
            baseCollisionShapeIndex=collision_shape,
            baseVisualShapeIndex=visual_shape,
            basePosition=self.position,
            baseOrientation=p.getQuaternionFromEuler([0, 0, 0])
        )
        return self.body_id