import pybullet as p
import pybullet_data
import time
import os

def setup_pybullet_scene():
    # Connect to PyBullet physics server
    physicsClient = p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    
    # Set gravity
    p.setGravity(0, 0, -9.81)
    
    # Load ground plane
    planeId = p.loadURDF("plane.urdf")
    
    # Load first object (e.g., a table)
    table_urdf_path = os.path.join(os.getcwd(), "services/render-object/assets/testingenv/table.urdf")
    tableId = p.loadURDF(
        table_urdf_path,
        baseOrientation=p.getQuaternionFromEuler([1.5, 1.5, 0])
    )
    
    # Load second object (e.g., a chair)
    chair_urdf_path = os.path.join(os.getcwd(), "services/render-object/assets/testingenv/chair.urdf")
    chairId = p.loadURDF(
        chair_urdf_path, # Place it 1 unit away from the table
        baseOrientation=p.getQuaternionFromEuler([1.5, 1.5, 0])
    )
    
    return tableId, chairId

def main():
    # Setup the scene
    tableId, chairId = setup_pybullet_scene()
    
    # Run simulation for a few seconds
    for i in range(10000):
        p.stepSimulation()
        time.sleep(1./2400.)  # Run at approximately 240 Hz
        
        # Get and print positions of objects
        table_pos, table_orn = p.getBasePositionAndOrientation(tableId)
        chair_pos, chair_orn = p.getBasePositionAndOrientation(chairId)
        
        if i % 100 == 0:  # Print every 100 steps
            print(f"Table position: {table_pos}")
            print(f"Chair position: {chair_pos}")
    
    # Disconnect from physics server
    p.disconnect()

if __name__ == "__main__":
    main()