import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../utils/AuthContext';
import { getUserEnvironments, createEnvironment, deleteEnvironment } from '../utils/firebase';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const GalleryContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const GalleryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderTitle = styled.h2`
  color: #f5f5f7;
  font-size: 1.8rem;
  margin: 0;
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: #f5f5f7;
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(123, 104, 238, 0.15);
    border-color: rgba(123, 104, 238, 0.6);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const CreateButton = styled.button`
  background-color: #7b68ee;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #6a57dd;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  width: 100%;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  background: rgba(30, 27, 38, 0.4);
  border-radius: 12px;
  border: 1px dashed rgba(123, 104, 238, 0.3);
  text-align: center;
  
  h3 {
    color: #f5f5f7;
    margin-bottom: 1rem;
  }
  
  p {
    color: #b3b3b7;
    margin-bottom: 2rem;
    max-width: 400px;
  }
`;

const ProjectCard = styled.div`
  background: rgba(30, 27, 38, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    border-color: rgba(123, 104, 238, 0.6);
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(255, 107, 107, 0.8);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
  
  ${ProjectCard}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background-color: rgba(255, 107, 107, 1);
    transform: scale(1.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProjectThumbnail = styled.div`
  height: 160px;
  width: 100%;
  background-color: #1a1721;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DefaultThumbnail = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2a2438 0%, #1a1721 100%);
  
  svg {
    width: 50px;
    height: 50px;
    color: rgba(123, 104, 238, 0.5);
  }
`;

const ProjectDetails = styled.div`
  padding: 1rem;
`;

const ProjectTitle = styled.h3`
  color: #f5f5f7;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProjectDate = styled.p`
  color: #b3b3b7;
  margin: 0;
  font-size: 0.8rem;
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 107, 0.3);
  text-align: center;
  color: #ff6b6b;
  
  h3 {
    margin-bottom: 1rem;
    color: #ff6b6b;
  }
  
  p {
    margin-bottom: 2rem;
    max-width: 600px;
  }
`;

const RefreshButton = styled.button`
  background-color: #7b68ee;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  margin-top: 1rem;
  
  &:hover {
    background-color: #6a57dd;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: rgba(30, 27, 38, 0.95);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  h2 {
    color: #f5f5f7;
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #f5f5f7;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  
  &:hover {
    color: #7b68ee;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #f5f5f7;
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  color: #f5f5f7;
  font-size: 1rem;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: #7b68ee;
  }
`;

const TextArea = styled.textarea`
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  color: #f5f5f7;
  font-size: 1rem;
  width: 100%;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #7b68ee;
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(123, 104, 238, 0.05);
  text-align: center;
  
  p {
    color: #b3b3b7;
    margin-top: 0.5rem;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  margin-top: 1rem;
`;

const SubmitButton = styled.button`
  background-color: #7b68ee;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #6a57dd;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  &:disabled {
    background-color: rgba(123, 104, 238, 0.5);
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-right: 8px;
`;

const ObjectTestOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
`;

const OverlayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(30, 27, 38, 0.9);
  border-bottom: 1px solid rgba(123, 104, 238, 0.3);
`;

const OverlayTitle = styled.h3`
  color: #f5f5f7;
  margin: 0;
`;

const OverlayCloseButton = styled.button`
  background: transparent;
  border: none;
  color: #f5f5f7;
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: #7b68ee;
  }
`;

const CanvasContainer = styled.div`
  flex: 1;
  position: relative;
`;

const ObjectInfo = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(30, 27, 38, 0.8);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  color: white;
  max-width: 300px;
  font-size: 14px;
`;

const SimulationButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: #7b68ee;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  z-index: 100;
  
  &:hover {
    background-color: #6a57dd;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  &:disabled {
    background-color: rgba(123, 104, 238, 0.5);
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

const SimulationStatus = styled.div`
  position: absolute;
  top: 80px;
  right: 20px;
  background: rgba(30, 27, 38, 0.8);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  color: white;
  font-size: 14px;
  z-index: 100;
`;

// First, add the styled component for the Training Button
const TrainingButton = styled.button`
  position: absolute;
  top: 140px;
  right: 20px;
  background-color: #6a57dd;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  z-index: 100;
  
  &:hover {
    background-color: #5a49cd;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  &:disabled {
    background-color: rgba(123, 104, 238, 0.5);
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

// Add a styled component for Training Status
const TrainingStatus = styled.div`
  position: absolute;
  top: 200px;
  right: 20px;
  background: rgba(30, 27, 38, 0.8);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  color: white;
  font-size: 14px;
  z-index: 100;
`;

// First, add the styled component for the Agent Button
const AgentButton = styled.button`
  position: absolute;
  top: 200px;
  right: 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  z-index: 100;
  
  &:hover {
    background-color: #3e8e41;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
  }
  
  &:disabled {
    background-color: rgba(76, 175, 80, 0.5);
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

// Add a styled component for Agent Status
const AgentStatus = styled.div`
  position: absolute;
  top: 260px;
  right: 20px;
  background: rgba(30, 27, 38, 0.8);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: white;
  font-size: 14px;
  z-index: 100;
`;

const ProjectGallery = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [objectFiles, setObjectFiles] = useState({});
  const [showObjectTest, setShowObjectTest] = useState(false);
  const [objectTestInfo, setObjectTestInfo] = useState(null);
  const testCanvasRef = useRef(null);
  const testSceneRef = useRef(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const simulationObjectsRef = useRef({});
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [agentAdded, setAgentAdded] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [agentObject, setAgentObject] = useState(null);
  const agentRef = useRef(null);

  const { currentUser, logout } = useAuth();

  const socket = useRef(null);
  useEffect(() => {
    socket.current = io("http://localhost:8000");
    socket.current.on("connect", () => {
      console.log("Connected to socket server");
    });
    // Listen for streamed data from the server.
    socket.current.on("upload_filename_response", (data) => {
      console.log("Received filename response:", data);
      const newObjectFiles = {};
      
      Object.keys(data).forEach((key) => {
        const fileData = data[key];
        if (fileData.obj_file_data) {
          // Store the raw object file data
          newObjectFiles[key] = {
            objData: atob(fileData.obj_file_data),
            position: fileData.position,
            orientation: fileData.orientation
          };
        }
      });
      
      setObjectFiles(newObjectFiles);
      
      // If objects were received, show the test overlay
      if (Object.keys(newObjectFiles).length > 0) {
        setShowObjectTest(true);
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  // Set up the Three.js test scene when objects are received
  useEffect(() => {
    if (showObjectTest && testCanvasRef.current && Object.keys(objectFiles).length > 0) {
      // Initialize Three.js scene
      const canvas = testCanvasRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);
      testSceneRef.current = scene;

      // Set up renderer
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true 
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Set up camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        canvas.clientWidth / canvas.clientHeight, 
        0.1, 
        1000
      );
      camera.position.z = 5;

      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
      backLight.position.set(-1, -1, -1);
      scene.add(backLight);

      // Add grid helper for reference
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);

      // Add axes helper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // Clear any previous object references
      simulationObjectsRef.current = {};

      // Load objects
      const loader = new OBJLoader();
      let loadedObjects = 0;
      let totalObjects = Object.keys(objectFiles).length;
      
      Object.entries(objectFiles).forEach(([key, fileData]) => {
        try {
          console.log(`Loading object ${key}...`);
          setObjectTestInfo(`Loading object ${key}...`);
          
          // Parse the OBJ data
          const object3D = loader.parse(fileData.objData);
          
          // Set position if available
          if (fileData.position) {
            object3D.position.set(...fileData.position);
          }
          
          // Set orientation if available
          if (fileData.orientation) {
            object3D.rotation.set(...fileData.orientation);
          }
          
          // Add default material if the object doesn't have one
          object3D.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (!child.material) {
                child.material = new THREE.MeshStandardMaterial({ 
                  color: 0x7b68ee,
                  metalness: 0.3,
                  roughness: 0.4
                });
              }
            }
          });
          
          // Add to scene
          scene.add(object3D);
          loadedObjects++;
          
          // Store reference to the object for simulation
          simulationObjectsRef.current[key] = object3D;

          console.log(`Object ${key} loaded successfully.`);
          setObjectTestInfo(`Loaded ${loadedObjects}/${totalObjects} objects. Last: ${key}`);
        } catch (error) {
          console.error(`Error loading object ${key}:`, error);
          setObjectTestInfo(`Error loading object ${key}: ${error.message}`);
        }
      });

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        // Dispose of Three.js resources
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        renderer.dispose();
      };
    }
  }, [showObjectTest, objectFiles]);

  // Add socket listener for simulation updates
  useEffect(() => {
    if (!socket.current) return;

    // Listen for object position updates from the server
    socket.current.on("simulation_step", (data) => {
      console.log("Received simulation step:", data);
      setSimulationStep(data.step);
      
      // Update object positions
      if (data.objects && testSceneRef.current) {
        // Process all objects in the data
        data.objects.forEach(obj => {
          // Check if this is the agent
          if (obj.filename === 'agent') {
            // Update agent if it exists
            if (agentRef.current) {
              agentRef.current.position.set(...obj.position);
              if (obj.orientation) {
                // Set quaternion directly
                agentRef.current.quaternion.set(...obj.orientation);
              }
              
              // Update agent info state for display, converting quaternion to Euler if needed
              setAgentInfo({
                position: obj.position,
                orientation: obj.orientation || [0, 0, 0, 1]
              });
            }
          } else {
            // Update regular objects
            if (simulationObjectsRef.current[obj.filename]) {
              const object3D = simulationObjectsRef.current[obj.filename];
              object3D.position.set(...obj.position);
              if (obj.orientation) {
                object3D.quaternion.set(...obj.orientation);
              }
            }
          }
        });
      }
      
      
    });

    return () => {
      socket.current.off("simulation_step");
    };
  }, []);

  const closeObjectTest = () => {
    setShowObjectTest(false);
  };

  const handleProjectSelect = (project) => {
    // Pass both the project data and any associated object files
    onSelectProject({
      ...project,
      objectFiles: objectFiles
    });
  };
  
  const fetchProjects = async () => {
    if (!currentUser) {
      console.error("Attempting to fetch projects but user is not logged in");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Fetching projects for user:", currentUser.uid);
      setLoading(true);
      setError(null);
      const userProjects = await getUserEnvironments(currentUser.uid);
      console.log("Projects fetched successfully:", userProjects);
      setProjects(userProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Failed to load your projects. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProjects();
  }, [currentUser]);
  
  const handleCreateButtonClick = () => {
    setShowCreateModal(true);
    setProjectName(`Project ${projects.length + 1}`);
    setProjectDescription('New 3D environment project');
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  const handleCloseModal = () => {
    setShowCreateModal(false);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmitNewProject = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      console.error("Attempting to create project but user is not logged in");
      return;
    }

    if (selectedImage) {
      try {
        console.log("Uploading filename to backend:", selectedImage.name);
        
        // Create the payload with both filename and user ID
        const filenamePayload = {
          filename: "testingenv",
          uid: currentUser.uid
        };
        
        // Make the POST request to the backend through socket
        socket.current.emit("upload_filename", filenamePayload);
      } catch (uploadError) {
        console.error("Error uploading filename:", uploadError);
      }
    }
    
    try {
      setIsCreatingProject(true);
      console.log("Creating new project for user:", currentUser.uid);
      
      // In a real application, you would upload the image to storage
      // Here we'll just use the data URL for demonstration
      const projectData = {
        name: projectName || `Project ${projects.length + 1}`,
        description: projectDescription || 'New 3D environment project',
        thumbnail: imagePreview, // In a real app, this would be a storage URL
        model_url: '/models/sample.obj' // Default sample model
      };
      
      const projectId = await createEnvironment(currentUser.uid, projectData);
      
      if (projectId) {
        console.log("Project created successfully:", projectId);
        // Fetch updated projects
        await fetchProjects();
        
        // Close modal
        setShowCreateModal(false);
        
        // Find the newly created project
        const newProject = projects.find(p => p.id === projectId);
        
        // Navigate to the new project if handler is provided
        if (newProject && onSelectProject) {
          console.log("Navigating to newly created project");
          onSelectProject(newProject);
        }
      } else {
        setError("Failed to create new project. Please try again.");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err.message || "Failed to create new project");
    } finally {
      setIsCreatingProject(false);
    }
  };
  
  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation(); // Prevent card click when delete button is clicked
    
    if (!currentUser) {
      console.error("Attempting to delete project but user is not logged in");
      return;
    }
    
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        setIsDeletingProject(true);
        console.log("Deleting project:", projectId);
        
        const success = await deleteEnvironment(currentUser.uid, projectId);
        
        if (success) {
          console.log("Project deleted successfully");
          // Remove project from state
          setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        } else {
          setError("Failed to delete project. Please try again.");
        }
      } catch (err) {
        console.error("Error deleting project:", err);
        setError(err.message || "Failed to delete project");
      } finally {
        setIsDeletingProject(false);
      }
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      console.log("User logged out successfully");
      // The AuthContext will handle the redirect to login page
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to log out. Please try again.");
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (err) {
      console.error("Error formatting date:", err);
      return 'Invalid date';
    }
  };
  
  const startSimulation = () => {
    if (!socket.current || isSimulating) return;
    
    setIsSimulating(true);
    setSimulationStep(0);
    
    // Create array of objects (excluding agent)
    const simulationObjects = Object.keys(simulationObjectsRef.current).map(key => ({
      filename: key,
      position: [
        simulationObjectsRef.current[key].position.x,
        simulationObjectsRef.current[key].position.y,
        simulationObjectsRef.current[key].position.z
      ],
      orientation: [
        simulationObjectsRef.current[key].rotation.x,
        simulationObjectsRef.current[key].rotation.y,
        simulationObjectsRef.current[key].rotation.z
      ]
    }));
    
    // Add agent to simulation data if it exists
    if (agentRef.current && agentAdded) {
      simulationObjects.push({
        filename: 'agent',
        position: [
          agentRef.current.position.x,
          agentRef.current.position.y,
          agentRef.current.position.z
        ],
        orientation: [
          agentRef.current.rotation.x,
          agentRef.current.rotation.y,
          agentRef.current.rotation.z
        ]
      });
    }
    
    // Emit event to start simulation
    socket.current.emit("start_simulation", {
      objects: simulationObjects
    });
    
    console.log("Simulation started with agent");
  };

  const startTraining = () => {
    if (!socket.current || isTraining) return;
    
    setIsTraining(true);
    setTrainingStatus("Initializing training...");
    
    const filenamePayload = {
      filename: "testingenv",
      uid: currentUser.uid
    };
    // Emit event to start training, passing the filenames just like with upload_filename
    socket.current.emit("start_training", 
      filenamePayload
    );

    // setIsSimulating(true);
    setSimulationStep(0);
    
    // Create array of objects (excluding agent)
    const simulationObjects = Object.keys(simulationObjectsRef.current).map(key => ({
      filename: key,
      position: [
        simulationObjectsRef.current[key].position.x,
        simulationObjectsRef.current[key].position.y,
        simulationObjectsRef.current[key].position.z
      ],
      orientation: [
        simulationObjectsRef.current[key].rotation.x,
        simulationObjectsRef.current[key].rotation.y,
        simulationObjectsRef.current[key].rotation.z
      ]
    }));
    
    // Add agent to simulation data if it exists
    if (agentRef.current && agentAdded) {
      simulationObjects.push({
        filename: 'agent',
        position: [
          agentRef.current.position.x,
          agentRef.current.position.y,
          agentRef.current.position.z
        ],
        orientation: [
          agentRef.current.rotation.x,
          agentRef.current.rotation.y,
          agentRef.current.rotation.z
        ]
      });
    }

    
    console.log("Training started");
  };
  
  // Add socket event listeners for training updates
  useEffect(() => {
    if (!socket.current) return;
    
    // Listen for training updates
    socket.current.on("training_status", (data) => {
      console.log("Received training status:", data);
      setTrainingStatus(data.message || "Training in progress...");
    });
    
    socket.current.on("training_complete", (data) => {
      console.log("Training completed:", data);
      setIsTraining(false);
      setTrainingStatus(`Training completed: ${data.message || "Success!"}`);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setTrainingStatus(null);
      }, 5000);
    });
    
    socket.current.on("training_error", (data) => {
      console.error("Training error:", data);
      setIsTraining(false);
      setTrainingStatus(`Training error: ${data.message || "Unknown error"}`);
    });
    
    return () => {
      socket.current.off("training_status");
      socket.current.off("training_complete");
      socket.current.off("training_error");
    };
  }, []);

  const addAgent = () => {
    if (!testSceneRef.current || agentAdded) return;
    
    // Create a cube with 0.5 length
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4caf50,  // Green color for agent
      metalness: 0.3,
      roughness: 0.4
    });
    
    const agentCube = new THREE.Mesh(geometry, material);
    
    // Position the cube at the center x, y and just above the plane (z=0.25 so bottom is at z=0)
    agentCube.position.set(0, 0, 0.25);
    
    // Add to scene
    testSceneRef.current.add(agentCube);
    
    // Store reference to the agent separately
    agentRef.current = agentCube;
    
    // Store agent data in state
    setAgentObject({
      position: [0, 0, 0.25],
      orientation: [0, 0, 0]
    });
    
    setAgentAdded(true);
    setAgentInfo({
      position: [0, 0, 0.25],
      orientation: [0, 0, 0]
    });
    
    // Also emit socket event to inform backend
    if (socket.current) {
      socket.current.emit("agent_added", {
        environment: "testingenv",
        agent: {
          type: "cube",
          size: 0.5,
          position: [0, 0, 0.25],
          orientation: [0, 0, 0]
        }
      });
    }
    
    console.log("Agent added to scene");
  };
  
  // Listen for socket updates about agent position from backend
  useEffect(() => {
    if (!socket.current) return;
    
    socket.current.on("agent_position_update", (data) => {
      console.log("Received agent position update:", data);
      
      if (data.position && simulationObjectsRef.current["agent_cube"]) {
        const agentCube = simulationObjectsRef.current["agent_cube"];
        agentCube.position.set(...data.position);
        
        if (data.orientation) {
          agentCube.rotation.set(...data.orientation);
        }
        
        // Update agent info state for display
        setAgentInfo({
          position: data.position,
          orientation: data.orientation || [0, 0, 0]
        });
        
        // Update object files state
        setObjectFiles(prevObjects => ({
          ...prevObjects,
          "agent_cube": {
            ...prevObjects["agent_cube"],
            position: data.position,
            orientation: data.orientation || [0, 0, 0]
          }
        }));
      }
    });
    
    return () => {
      socket.current.off("agent_position_update");
    };
  }, []);

  if (!currentUser) {
    return (
      <GalleryContainer>
        <ErrorState>
          <h3>Authentication Error</h3>
          <p>You must be logged in to view your projects. Please refresh the page and try again.</p>
          <RefreshButton onClick={() => window.location.reload()}>
            Refresh Page
          </RefreshButton>
        </ErrorState>
      </GalleryContainer>
    );
  }
  
  if (error) {
    return (
      <GalleryContainer>
        <GalleryHeader>
          <HeaderTitle>My Projects</HeaderTitle>
        </GalleryHeader>
        <ErrorState>
          <h3>Error Loading Projects</h3>
          <p>{error}</p>
          <RefreshButton onClick={fetchProjects}>
            Try Again
          </RefreshButton>
          <RefreshButton onClick={() => window.location.reload()} style={{ marginTop: '0.5rem' }}>
            Refresh Page
          </RefreshButton>
        </ErrorState>
      </GalleryContainer>
    );
  }
  
  if (loading) {
    return (
      <GalleryContainer>
        <GalleryHeader>
          <HeaderTitle>My Projects</HeaderTitle>
        </GalleryHeader>
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: 'rgba(30, 27, 38, 0.4)',
          borderRadius: '12px'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid rgba(123, 104, 238, 0.3)',
              borderTop: '4px solid #7b68ee',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
          <p style={{ color: '#b3b3b7' }}>Loading your projects...</p>
          <RefreshButton onClick={fetchProjects} style={{ margin: '1rem auto 0' }}>
            Refresh
          </RefreshButton>
        </div>
      </GalleryContainer>
    );
  }
  
  return (
    <GalleryContainer>
      <GalleryHeader>
        <HeaderLeft>
          <HeaderTitle>My Projects</HeaderTitle>
          <LogoutButton onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </LogoutButton>
        </HeaderLeft>
        <CreateButton onClick={handleCreateButtonClick} disabled={isCreatingProject}>
          {isCreatingProject ? (
            <>
              <LoadingSpinner />
              Creating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </>
          )}
        </CreateButton>
      </GalleryHeader>
      
      {projects.length === 0 ? (
        <EmptyState>
          <h3>No projects yet</h3>
          <p>Get started by creating your first 3D environment project</p>
          <CreateButton onClick={handleCreateButtonClick} disabled={isCreatingProject}>
            {isCreatingProject ? (
              <>
                <LoadingSpinner />
                Creating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Project
              </>
            )}
          </CreateButton>
        </EmptyState>
      ) : (
        <ProjectsGrid>
          {projects.map((project) => (
            <ProjectCard key={project.id} onClick={() => handleProjectSelect(project)}>
              <DeleteButton 
                onClick={(e) => handleDeleteProject(e, project.id)}
                disabled={isDeletingProject}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </DeleteButton>
              <ProjectThumbnail>
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt={project.name} />
                ) : (
                  <DefaultThumbnail>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  </DefaultThumbnail>
                )}
              </ProjectThumbnail>
              <ProjectDetails>
                <ProjectTitle>{project.name}</ProjectTitle>
                <ProjectDate>Created: {formatDate(project.created_at)}</ProjectDate>
              </ProjectDetails>
            </ProjectCard>
          ))}
        </ProjectsGrid>
      )}
      
      {showCreateModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>Create New Project</h2>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <Form onSubmit={handleSubmitNewProject}>
              <FormGroup>
                <Label htmlFor="projectName">Project Name</Label>
                <Input 
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="projectDescription">Prompt</Label>
                <TextArea 
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe what you want to create"
                />
              </FormGroup>
              <FormGroup>
                <Label>Image Prompt</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <FileUploadArea 
                  onClick={handleFileUploadClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="rgba(123, 104, 238, 0.5)"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                    />
                  </svg>
                  <p>Upload an image that will be used as project thumbnail</p>
                  {imagePreview && <ImagePreview src={imagePreview} alt="Preview" />}
                </FileUploadArea>
              </FormGroup>
              <SubmitButton type="submit" disabled={isCreatingProject}>
                {isCreatingProject ? 'Creating...' : 'Create Project'}
              </SubmitButton>
            </Form>
          </ModalContent>
        </Modal>
      )}
      
      {showObjectTest && (
        <ObjectTestOverlay>
          {/* <OverlayHeader>
            <OverlayTitle>Testing 3D Object Loading</OverlayTitle>
            <OverlayCloseButton onClick={closeObjectTest}>&times;</OverlayCloseButton>
          </OverlayHeader> */}
          <CanvasContainer>
            <canvas 
              ref={testCanvasRef} 
              style={{ width: '100%', height: '100%' }} 
            />
            {objectTestInfo && (
              <ObjectInfo>
                <div><strong>Object Info:</strong></div>
                <div>{objectTestInfo}</div>
                <div style={{ marginTop: '5px', fontSize: '12px' }}>
                  <em>Use mouse to rotate, scroll to zoom</em>
                </div>
              </ObjectInfo>
            )}
            
            {/* Simulation button */}
            <SimulationButton 
              onClick={startSimulation}
              disabled={isSimulating || Object.keys(simulationObjectsRef.current).length === 0}
            >
              {isSimulating ? 'Simulating...' : 'Start Simulation'}
            </SimulationButton>
            
            {/* Add Training button */}
            <TrainingButton 
              onClick={startTraining}
              disabled={isTraining || Object.keys(simulationObjectsRef.current).length === 0}
            >
              {isTraining ? 'Training...' : 'Start Training'}
            </TrainingButton>
            
            {/* Add Agent button */}
            <AgentButton 
              onClick={addAgent}
              disabled={agentAdded}
            >
              {agentAdded ? 'Agent Added' : 'Add Agent'}
            </AgentButton>
            
            {/* Simulation status */}
            {isSimulating && (
              <SimulationStatus>
                Simulation Step: {simulationStep}/20
              </SimulationStatus>
            )}
            
            {/* Training status */}
            {trainingStatus && (
              <TrainingStatus>
                {trainingStatus}
              </TrainingStatus>
            )}
            
            {/* Agent info */}
            {agentInfo && (
              <AgentStatus>
                Agent position: [{agentInfo.position.map(p => p.toFixed(2)).join(', ')}]
              </AgentStatus>
            )}
          </CanvasContainer>
        </ObjectTestOverlay>
      )}
    </GalleryContainer>
  );
};

export default ProjectGallery;