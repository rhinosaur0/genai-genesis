import pybullet as p
import pybullet_data
import time

def main():
    # Connect to PyBullet GUI
    p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    
    # Reset simulation to ensure no extra objects are loaded
    p.resetSimulation()
    
    # Now, restore the saved state. Do not load any URDFs before this.
    state_id = p.restoreState(fileName="test.bullet")
    if state_id < 0:
        raise Exception("Restore state failed!")
    print("State restored successfully.")
    
    # Run the simulation to see the restored state.
    while p.getConnectionInfo()["isConnected"]:
        p.stepSimulation()
        time.sleep(1/240)
    
    p.disconnect()

if __name__ == "__main__":
    main()
