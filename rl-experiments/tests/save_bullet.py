import pybullet as p
import pybullet_data
import time

def load_snapshot_urdf(urdf_filename):
    """
    Loads the given URDF file into the simulation.
    Returns the robot id.
    """
    robot_id = p.loadURDF(urdf_filename)
    print(f"Loaded URDF snapshot '{urdf_filename}' with robot id {robot_id}")
    return robot_id

def main():
    # Connect to PyBullet in GUI mode.
    p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())

    
    # Optionally, set gravity and load a ground plane for reference.
    p.setGravity(0, 0, -9.81)
    p.loadURDF("plane.urdf")

    
    # Load the URDF snapshot file.
    # Make sure "snapshot.urdf" is in the working directory.
    robot_id = load_snapshot_urdf("target_object.urdf")
    
    # Run the simulation so you can inspect the loaded state.
    while p.getConnectionInfo()["isConnected"]:
        p.stepSimulation()
        time.sleep(1/240)
    
    p.disconnect()

if __name__ == "__main__":
    main()
