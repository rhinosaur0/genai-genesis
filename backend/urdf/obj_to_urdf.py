import xml.etree.ElementTree as ET

def generate_urdf(obj_file, urdf_file, name="chair", mass=1.0,
                  scale="1 1 1", origin_xyz="0 0 0", origin_rpy="0 0 0"):
    """
    Generate a URDF file from an OBJ file.
    
    The URDF file will have a single link (named 'body_0') with:
      - Minimal inertial data.
      - Visual and collision elements referencing the OBJ file.
      - Specified origin and scale for the mesh.
    """
    # Create the root <robot> element.
    robot = ET.Element("robot", attrib={"name": name})
    
    # Create a <link> element for the body.
    link = ET.SubElement(robot, "link", attrib={"name": "body_0"})
    
    # Add inertial data (minimal).
    inertial = ET.SubElement(link, "inertial")
    inertial_origin = ET.SubElement(inertial, "origin", 
                                    attrib={"xyz": "0 0 0", "rpy": "0 0 0"})
    mass_elem = ET.SubElement(inertial, "mass", attrib={"value": str(mass)})
    inertia_elem = ET.SubElement(inertial, "inertia", attrib={
        "ixx": "1", "iyy": "1", "izz": "1",
        "ixy": "0", "ixz": "0", "iyz": "0"
    })
    
    # Set the link's origin to the specified values.
    origin_elem = ET.SubElement(link, "origin", 
                                attrib={"xyz": origin_xyz, "rpy": origin_rpy})
    
    # Create the visual element.
    visual = ET.SubElement(link, "visual")
    visual_origin = ET.SubElement(visual, "origin", 
                                  attrib={"xyz": origin_xyz, "rpy": origin_rpy})
    visual_geometry = ET.SubElement(visual, "geometry")
    ET.SubElement(visual_geometry, "mesh", 
                  attrib={"filename": obj_file, "scale": scale})
    
    # Create the collision element.
    collision = ET.SubElement(link, "collision")
    collision_origin = ET.SubElement(collision, "origin", 
                                     attrib={"xyz": origin_xyz, "rpy": origin_rpy})
    collision_geometry = ET.SubElement(collision, "geometry")
    ET.SubElement(collision_geometry, "mesh", 
                  attrib={"filename": obj_file, "scale": scale})
    
    # Write the XML tree to the URDF file.
    tree = ET.ElementTree(robot)
    tree.write(urdf_file)
    print(f"URDF file generated: {urdf_file}")

if __name__ == "__main__":

    generate_urdf("table.obj", "table.urdf")

