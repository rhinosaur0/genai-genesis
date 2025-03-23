import pybullet as p
import pybullet_data
import time

def detect_collision(body_a, body_b, distance_threshold=0.0):
    """
    Check if two bodies are colliding using getClosestPoints.
    A threshold of 0.0 indicates a contact point.
    """
    contacts = p.getClosestPoints(bodyA=body_a, bodyB=body_b, distance=distance_threshold)
    return len(contacts) > 0

def main():
    # Connect to PyBullet in GUI mode
    physicsClient = p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    
    # Set gravity so objects fall naturally
    p.setGravity(0, 0, -9.81)
    
    # Load a ground plane for the objects to rest on
    plane_id = p.loadURDF("plane.urdf")
    
    # ------------------------------
    # Create the Mesh Object
    # ------------------------------
    # Ensure you have exported your mesh to an OBJ file (e.g., "output_file.obj")
    # Adjust the file path as needed.
    mesh_scale = [1, 1, 1]
    mesh_collision_shape = p.createCollisionShape(
        shapeType=p.GEOM_MESH,
        fileName="backend/output_file.obj",
        meshScale=mesh_scale
    )
    mesh_visual_shape = p.createVisualShape(
        shapeType=p.GEOM_MESH,
        fileName="backend/output_file.obj",
        meshScale=mesh_scale,
        rgbaColor=[0, 1, 0, 1]  # Green color for the mesh
    )
    
    # Position the mesh on the right side (e.g., [2, 0, 1])
    mesh_start_pos = [2, 0, 1]
    mesh_start_orientation = p.getQuaternionFromEuler([0, 0, 0])
    
    mesh_body = p.createMultiBody(
        baseMass=1.0,
        baseCollisionShapeIndex=mesh_collision_shape,
        baseVisualShapeIndex=mesh_visual_shape,
        basePosition=mesh_start_pos,
        baseOrientation=mesh_start_orientation
    )
    
    # ------------------------------
    # Create the Sphere Object
    # ------------------------------
    sphere_radius = 0.2
    sphere_collision_shape = p.createCollisionShape(p.GEOM_SPHERE, radius=sphere_radius)
    sphere_visual_shape = p.createVisualShape(p.GEOM_SPHERE, radius=sphere_radius, rgbaColor=[1, 0, 0, 1])
    
    # Position the sphere on the left side (e.g., [-2, 0, 1])
    sphere_start_pos = [-2, 0, 1]
    sphere_start_orientation = p.getQuaternionFromEuler([0, 0, 0])
    
    sphere_body = p.createMultiBody(
        baseMass=1.0,
        baseCollisionShapeIndex=sphere_collision_shape,
        baseVisualShapeIndex=sphere_visual_shape,
        basePosition=sphere_start_pos,
        baseOrientation=sphere_start_orientation
    )
    
    # ------------------------------
    # Set Initial Velocities
    # ------------------------------
    # Let the sphere move right and the mesh move left.
    horizontal_speed = 4.0  # Faster horizontal speed (4 m/s)
    p.resetBaseVelocity(sphere_body, linearVelocity=[horizontal_speed, 0, 0])
    p.resetBaseVelocity(mesh_body, linearVelocity=[-horizontal_speed, 0, 0])
    
    print("Mesh and sphere created, moving towards each other with gravity.")
    
    # ------------------------------
    # Simulation Loop
    # ------------------------------
    steps = 1000
    for i in range(steps):
        p.stepSimulation()
        time.sleep(1/240)  # match simulation time step
        
        pos_sphere, _ = p.getBasePositionAndOrientation(sphere_body)
        pos_mesh, _ = p.getBasePositionAndOrientation(mesh_body)
        
        # Check for collision between the sphere and the mesh
        if detect_collision(sphere_body, mesh_body):
            print(f"Collision detected at step {i}:")
            print(f"  Sphere position: {pos_sphere}")
            print(f"  Mesh position: {pos_mesh}")
            break

    print("Simulation finished. Press Ctrl+C to exit.")
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass

    p.disconnect()

if __name__ == "__main__":
    main()
