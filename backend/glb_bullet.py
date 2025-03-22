import pybullet as p
import pybullet_data
import trimesh
import numpy as np
import time

def main():
    # Connect to PyBullet (GUI mode)
    physicsClient = p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    
    # Set gravity in the simulation
    p.setGravity(0, 0, -9.81)
    
    # Optionally, load a plane for the object to collide with
    plane_id = p.loadURDF("plane.urdf")


    shift = [0, -0.02, 0]
    meshScale = [1, 1, 1]
    
    # Load your GLB file using trimesh (update the path to your GLB file)
    mesh = trimesh.load("sample.glb")
    mesh.export("output_file.obj")
    # if isinstance(mesh, trimesh.Scene):
    #     # Option 1: Choose one mesh (e.g., the first one)
    #     # selected_mesh = list(mesh.geometry.values())[0]
        
    #     # Option 2: Concatenate all meshes into one
    #     selected_mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
    # else:
    #     selected_mesh = mesh
    
    # # Extract vertices and faces (indices) from the mesh
    # vertices = np.array(selected_mesh.vertices).tolist()
    # indices = np.array(selected_mesh.faces).flatten().tolist()
    
    # print(f"Loaded mesh with {len(vertices)} vertices and {len(indices)//3} triangles.")
    
    # Create a collision shape from the mesh data
    collision_shape_id = p.createCollisionShape(
        shapeType=p.GEOM_MESH,
        fileName = "output_file.obj",
        meshScale=meshScale,
        collisionFramePosition=shift

    )
    
    # Optionally, create a visual shape so you can see the object in the simulation
    visual_shape_id = p.createVisualShape(
        shapeType=p.GEOM_MESH,
        fileName = "output_file.obj",
        meshScale=meshScale,
        visualFramePosition=shift,
        specularColor=[0.4, .4, 0],
        rgbaColor=[1, 1, 1, 1]  # White color
    )
    
    # Define mass and the initial transform for the object
    mass = 1.0
    start_position = [0, 0, 1]  # Start one meter above the ground
    start_orientation = p.getQuaternionFromEuler([0, 0, 0])
    
    # Create a multi-body object using the collision and visual shapes
    body_id = p.createMultiBody(
        baseMass=mass,
        baseCollisionShapeIndex=collision_shape_id,
        baseVisualShapeIndex=visual_shape_id,
        basePosition=start_position,
        baseOrientation=start_orientation
    )
    
    print("Physics object created, starting simulation...")
    
    # Run the simulation for a few seconds
    for _ in range(240):  # roughly 1 second at 240Hz
        p.stepSimulation()
        pos, orn = p.getBasePositionAndOrientation(body_id)
        print("Body position:", pos)
        time.sleep(1/240)  # Sleep to sync with simulation time step
    
    # Keep the simulation window open for a while
    print("Simulation finished. Press Ctrl+C to exit.")
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass

    # Disconnect from the simulation
    p.disconnect()

if __name__ == "__main__":
    main()

