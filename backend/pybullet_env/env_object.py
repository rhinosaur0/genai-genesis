import pybullet as p
import xml.etree.ElementTree as ET


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
    
    # Create the root element of the URDF
    def save_positions_to_urdf(self, filename="snapshot.urdf", mesh_filename="output.obj"):
        """
        Save a URDF snapshot of a single body.
        The URDF includes a link with its current origin (position and orientation)
        and a visual element that references a mesh file (e.g., output.obj).
        A matching collision element is also added.
        """
        # Get the current position and orientation (as quaternion) of the body.
        pos, orn = p.getBasePositionAndOrientation(self.body_id)
        # Convert quaternion to Euler angles (roll, pitch, yaw)
        rpy = p.getEulerFromQuaternion(orn)
        
        # Create the root <robot> element.
        robot = ET.Element("robot", attrib={"name": "snapshot_robot"})
        
        # Create a <link> element representing the body.
        link = ET.SubElement(robot, "link", attrib={"name": "body_0"})
        
        # Add inertial data (minimal, to avoid warnings).
        inertial = ET.SubElement(link, "inertial")
        inertial_origin = ET.SubElement(inertial, "origin")
        inertial_origin.set("xyz", "0 0 0")
        inertial_origin.set("rpy", "0 0 0")
        mass_elem = ET.SubElement(inertial, "mass")
        mass_elem.set("value", "1")
        inertia_elem = ET.SubElement(inertial, "inertia")
        inertia_elem.set("ixx", "1")
        inertia_elem.set("ixy", "0")
        inertia_elem.set("ixz", "0")
        inertia_elem.set("iyy", "1")
        inertia_elem.set("iyz", "0")
        inertia_elem.set("izz", "1")
        
        # Set the link's origin to the current pose.
        origin = ET.SubElement(link, "origin")
        origin.set("xyz", f"{pos[0]} {pos[1]} {pos[2]}")
        origin.set("rpy", f"{rpy[0]} {rpy[1]} {rpy[2]}")
        
        # Use the absolute path for the mesh file.
        
        # Add a <visual> element referencing the mesh.
        visual = ET.SubElement(link, "visual")
        visual_origin = ET.SubElement(visual, "origin")
        visual_origin.set("xyz", "0 0 0")
        visual_origin.set("rpy", "0 0 0")
        visual_geometry = ET.SubElement(visual, "geometry")
        ET.SubElement(visual_geometry, "mesh", attrib={"filename": 'output.obj'})
        
        # Add a <collision> element using the same mesh.
        collision = ET.SubElement(link, "collision")
        collision_origin = ET.SubElement(collision, "origin")
        collision_origin.set("xyz", "0 0 0")
        collision_origin.set("rpy", "0 0 0")
        collision_geometry = ET.SubElement(collision, "geometry")
        ET.SubElement(collision_geometry, "mesh", attrib={"filename": 'output.obj'})
        
        # Write the XML tree to file.
        tree = ET.ElementTree(robot)
        tree.write(filename)
        print(f"URDF snapshot saved to {filename}")