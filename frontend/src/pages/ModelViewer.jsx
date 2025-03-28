import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { askGemini } from '../utils/geminiApi';
import ReactMarkdown from 'react-markdown';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

const ViewerContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  background-color: #13111a;
  color: white;
  overflow: hidden;
`;

const Sidebar = styled.div`
  height: 100vh;
  width: ${props => props.width}px;
  min-width: ${props => props.$isOpen ? '150px' : '40px'};
  max-width: ${props => props.$isOpen ? '400px' : '40px'};
  background-color: #191622;
  transition: ${props => props.$isDragging ? 'none' : 'width 0.3s ease'};
  z-index: 100;
  border-right: 1px solid rgba(123, 104, 238, 0.3);
  overflow: hidden;
  position: relative;
`;

const SidebarToggle = styled.button`
  position: absolute;
  right: 0;
  top: 20px;
  width: 20px;
  height: 30px;
  background-color: rgba(123, 104, 238, 0.3);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px 0 0 3px;
  z-index: 10;
`;

const SidebarContent = styled.div`
  padding: 20px 15px;
  height: 100%;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  overflow: auto;
  
  h3 {
    color: #ffffff;
    margin-bottom: 20px;
    font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
    font-size: 16px;
  }
`;

const ActionButton = styled.button`
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  background-color: rgba(30, 27, 38, 0.7);
  color: white;
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  font-size: 14px;
  
  &:hover {
    background-color: rgba(123, 104, 238, 0.4);
    border-color: rgba(123, 104, 238, 0.8);
  }
`;

const MainContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: calc(100% - ${props => props.$sidebarOpen ? props.width : '40px'});
  transition: width 0.3s ease;
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(123, 104, 238, 0.2);
  color: white;
  border: 1px solid rgba(123, 104, 238, 0.5);
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
  font-size: 0.9rem;
  font-weight: 500;
  
  &:hover {
    background: rgba(123, 104, 238, 0.4);
  }
`;

const ViewerToolbar = styled.div`
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 10;
`;

const ToolbarButton = styled.button`
  background: ${props => props.$active ? 'rgba(123, 104, 238, 0.8)' : 'rgba(30, 27, 38, 0.7)'};
  color: white;
  border: 1px solid ${props => props.$active ? 'rgba(123, 104, 238, 0.8)' : 'rgba(123, 104, 238, 0.3)'};
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  
  &:hover {
    background: ${props => props.$active ? 'rgba(123, 104, 238, 0.9)' : 'rgba(123, 104, 238, 0.4)'};
  }
`;

const ModeIndicator = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 4px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 5;
`;

const ViewerFrame = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #13111a;
  position: relative;
`;

const ThreeJSContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  canvas {
    width: 100% !important;
    height: 100% !important;
    outline: none;
  }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-10px) rotate(2deg); }
  100% { transform: translateY(0) rotate(0); }
`;

const BackgroundGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 70% 20%, rgba(123, 104, 238, 0.1) 0%, transparent 40%),
              radial-gradient(circle at 30% 70%, rgba(123, 104, 238, 0.1) 0%, transparent 40%);
  z-index: 1;
  pointer-events: none;
`;

const FloatingParticle = styled.div`
  position: absolute;
  width: ${props => props.size || 4}px;
  height: ${props => props.size || 4}px;
  background-color: ${props => props.color || '#7b68ee'};
  opacity: ${props => props.opacity || 0.6};
  border-radius: 50%;
  z-index: 2;
  left: ${props => props.left}%;
  top: ${props => props.top}%;
  animation: ${floatAnimation} ${props => props.speed || '15s'} infinite alternate-reverse ease-in-out;
  animation-delay: ${props => props.delay || '0s'};
  pointer-events: none;
`;

const ModelPreview = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
`;

const PreviewImage = styled.img`
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const InfoCard = styled.div`
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto 20px;
  text-align: left;
`;

const ChatSidebar = styled.div`
  width: ${props => props.width}px;
  min-width: 250px;
  max-width: 600px;
  height: 100vh;
  background: rgba(25, 22, 34, 0.95);
  border-left: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  flex-direction: column;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  transition: ${props => props.$isDragging ? 'none' : 'transform 0.3s ease'};
  position: fixed;
  right: 0;
  top: 0;
  transform: translateX(${props => props.$isOpen ? '0' : '100%'});
  z-index: 100;
`;

const ChatHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(123, 104, 238, 0.3);
  text-align: center;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 16px;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
`;

const Message = styled.div`
  max-width: 85%;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${props => props.isUser ? 'rgba(123, 104, 238, 0.3)' : 'rgba(30, 27, 38, 0.7)'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  
  pre {
    background-color: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
    margin: 10px 0;
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 12px;
  }
  
  code {
    background-color: rgba(0, 0, 0, 0.2);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 12px;
  }
`;

const ChatInput = styled.div`
  padding: 12px;
  border-top: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  gap: 10px;
`;

const Input = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 150px;
  padding: 10px 16px;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 20px;
  color: white;
  outline: none;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  resize: none;
  overflow-y: auto;
  line-height: 1.5;
  
  &:focus {
    border-color: rgba(123, 104, 238, 0.8);
  }
`;

const SendButton = styled.button`
  background: #7b68ee;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ModelStatus = styled.div`
  position: absolute;
  bottom: 80px;
  left: 20px;
  background: rgba(30, 27, 38, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.9rem;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModelGeneratingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  width: 100%;
  background: rgba(20, 18, 26, 0.4);
  border-radius: 8px;
  padding: 2rem;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
`;

const GeneratingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 1.5rem 0;
  
  span {
    display: inline-block;
    width: 12px;
    height: 12px;
    background-color: #7b68ee;
    border-radius: 50%;
    animation: pulse 1.5s infinite ease-in-out;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  
  &:hover {
    color: #7b68ee;
  }
`;

const ChatToggleButton = styled.button`
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(123, 104, 238, 0.8);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: rgba(123, 104, 238, 1);
  }
`;

// Replace the ResizeHandle component with a more visible version
const ResizeHandle = styled.div`
  position: absolute;
  width: 8px;
  height: 100%;
  top: 0;
  bottom: 0;
  cursor: col-resize;
  z-index: 200;
  background-color: rgba(123, 104, 238, 0.2);
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: "";
    display: block;
    width: 2px;
    height: 20px;
    background-color: rgba(123, 104, 238, 0.8);
    border-radius: 1px;
  }

  &:hover {
    background-color: rgba(123, 104, 238, 0.4);
    &::after {
      height: 40px;
    }
  }
  
  &:active {
    background-color: rgba(123, 104, 238, 0.6);
  }
`;

const ViewerTitle = styled.h2`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  background: rgba(30, 27, 38, 0.7);
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  z-index: 5;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  font-size: 1.2rem;
  margin: 0;
  text-align: center;
`;

// Create a custom hook for drag functionality
function useDraggableWidth(initialWidth, minWidth, maxWidth) {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = (e) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setIsDragging(true);
  };
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      let newWidth;
      if (e.clientX < window.innerWidth / 2) {
        // Left sidebar
        newWidth = e.clientX;
      } else {
        // Right sidebar
        newWidth = window.innerWidth - e.clientX;
      }
      
      // Apply constraints
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth]);
  
  return [width, setWidth, isDragging, handleMouseDown];
}

function ModelViewer({ modelData, onBack, projectData }) {
  const [sidebarWidth, setSidebarWidth, isDraggingSidebar, handleSidebarMouseDown] = useDraggableWidth(250, 150, 400);
  const [chatSidebarWidth, setChatSidebarWidth, isDraggingChatSidebar, handleChatSidebarMouseDown] = useDraggableWidth(300, 250, 600);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [particles, setParticles] = useState([]);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('view'); // 'view', 'edit', 'train'
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const objectRef = useRef(null);
  const chatContainerRef = useRef(null);
  const requestRef = useRef(null);
  
  // Generate random particles
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        id: i,
        size: Math.random() * 3 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 20 + 10 + 's',
        delay: Math.random() * 5 + 's'
      });
    }
    setParticles(newParticles);
  }, []);
  
  useEffect(() => {
    console.log("Model data changed:", modelData);
    console.log("Project data:", projectData);
    if (!modelData) return;

    const canvas = canvasRef.current;
    const container = frameRef.current;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13111a);
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-1, -1, -1);
    scene.add(backLight);

    // Load the main model if provided in modelData
    const loader = new OBJLoader();
    if (modelData.model) {
      try {
        loader.load(
          modelData.model,
          (object) => {
            // Center the object in the scene
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Reset position to center of bounding box
            object.position.x -= center.x;
            object.position.y -= center.y;
            object.position.z -= center.z;

            // Scale if needed
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 10) {
              const scale = 10 / maxDim;
              object.scale.set(scale, scale, scale);
            }

            // Add to scene
            scene.add(object);
            objectRef.current = object;
          },
          (xhr) => {
            console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
          },
          (error) => {
            console.error("Error loading model:", error);
          }
        );
      } catch (error) {
        console.error("Error loading main model:", error);
      }
    }

    // Load object files from projectData (if available)
    if (projectData && projectData.objectFiles) {
      console.log("Loading project object files:", projectData.objectFiles);
      Object.keys(projectData.objectFiles).forEach((key) => {
        const objInfo = projectData.objectFiles[key];
        try {
          // If we have objData as a string, parse it directly
          if (objInfo.objData) {
            const object = loader.parse(objInfo.objData);
            
            // Set position if available
            if (objInfo.position) {
              object.position.set(
                objInfo.position[0] || 0,
                objInfo.position[1] || 0,
                objInfo.position[2] || 0
              );
            }
            
            // Set orientation if available
            if (objInfo.orientation) {
              object.rotation.set(
                objInfo.orientation[0] || 0,
                objInfo.orientation[1] || 0,
                objInfo.orientation[2] || 0
              );
            }
            
            // Add default material if needed
            object.traverse((child) => {
              if (child instanceof THREE.Mesh && !child.material) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x7b68ee,
                  metalness: 0.3,
                  roughness: 0.4
                });
              }
            });
            
            scene.add(object);
          }
          // If URL is provided instead of objData
          else if (objInfo.url) {
            loader.load(
              objInfo.url,
              (object) => {
                // Set position and orientation if provided
                if (objInfo.position) {
                  object.position.set(
                    objInfo.position[0] || 0,
                    objInfo.position[1] || 0,
                    objInfo.position[2] || 0
                  );
                }
                if (objInfo.orientation) {
                  object.rotation.set(
                    objInfo.orientation[0] || 0,
                    objInfo.orientation[1] || 0,
                    objInfo.orientation[2] || 0
                  );
                }
                scene.add(object);
              },
              (xhr) => {
                console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
              },
              (error) => {
                console.error('An error occurred while loading the object:', error);
              }
            );
          }
        } catch (error) {
          console.error(`Error loading object ${key}:`, error);
        }
      });
    }

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && frameRef.current) {
        const container = frameRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [modelData, projectData]);
  
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user'
    };
    
    setChatHistory([...chatHistory, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Create a context-aware prompt for the AI
      const promptWithContext = `You are an AI assistant helping with a 3D model project${
        projectData?.name ? ` called "${projectData.name}"` : ""
      }${
        projectData?.description ? ` with the description: "${projectData.description}"` : ""
      }. The user is in ${viewMode} mode. 
      
      User message: ${message}`;
      
      // Get response from Gemini
      const response = await askGemini(promptWithContext);
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai'
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't process your request. Please try again.",
        sender: 'ai',
        isError: true
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Scroll to the bottom of the chat
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 100);
      }
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const getModeDescription = () => {
    switch (viewMode) {
      case 'edit': return 'Edit Mode';
      case 'train': return 'Training Mode';
      default: return 'View Mode';
    }
  };
  
  const handleEditButton = () => {
    setViewMode('edit');
  };
  
  const handleViewButton = () => {
    setViewMode('view');
  };
  
  const handleTrainButton = () => {
    setViewMode('train');
  };
  
  const handleBackToProjects = () => {
    // Clean up any resources before navigating back
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    
    // Call the provided onBack function to navigate back
    if (onBack && typeof onBack === 'function') {
      onBack();
    }
  };
  
  return (
    <ViewerContainer>
      <Sidebar 
        width={sidebarWidth} 
        $isOpen={sidebarOpen}
        $isDragging={isDraggingSidebar}
      >
        <SidebarToggle onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '<' : '>'}
        </SidebarToggle>
        <div style={{ width: '100%', cursor: 'ew-resize', position: 'absolute', top: 0, right: 0, bottom: 0, width: '5px' }} 
          onMouseDown={handleSidebarMouseDown}
        />
        <SidebarContent $isOpen={sidebarOpen}>
          <h3>Project Settings</h3>
          <ActionButton onClick={handleViewButton}>View Mode</ActionButton>
          <ActionButton onClick={handleEditButton}>Edit Mode</ActionButton>
          <ActionButton onClick={handleTrainButton}>Training Mode</ActionButton>
          <hr style={{ margin: '20px 0', borderColor: 'rgba(123, 104, 238, 0.3)' }} />
          <ActionButton onClick={handleBackToProjects}>Back to Projects</ActionButton>
        </SidebarContent>
      </Sidebar>
      
      <MainContent ref={frameRef} width={sidebarWidth} $sidebarOpen={sidebarOpen}>
        <BackgroundGradient />
        {particles.map(particle => (
          <FloatingParticle
            key={particle.id}
            size={particle.size}
            left={particle.left}
            top={particle.top}
            opacity={particle.opacity}
            speed={particle.speed}
            delay={particle.delay}
          />
        ))}
        
        <BackButton onClick={handleBackToProjects}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Projects
        </BackButton>
        
        <ViewerToolbar>
          <ToolbarButton 
            onClick={handleViewButton} 
            $active={viewMode === 'view'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3C4.5 3 2 8 2 8C2 8 4.5 13 8 13C11.5 13 14 8 14 8C14 8 11.5 3 8 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            View
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleEditButton} 
            $active={viewMode === 'edit'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14 4L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14L2 12L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleTrainButton} 
            $active={viewMode === 'train'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 6V4C5 2.89543 5.89543 2 7 2H9C10.1046 2 11 2.89543 11 4V6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Train
          </ToolbarButton>
        </ViewerToolbar>
        
        <ModeIndicator>
          {getModeDescription()}
        </ModeIndicator>
        
        <ViewerFrame>
          <ThreeJSContainer>
            <canvas ref={canvasRef} />
          </ThreeJSContainer>
        </ViewerFrame>
        
        {chatOpen && (
          <ChatSidebar 
            width={chatSidebarWidth} 
            $isOpen={chatOpen} 
            $isDragging={isDraggingChatSidebar}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '5px',
                height: '100%',
                cursor: 'ew-resize',
                zIndex: 100
              }}
              onMouseDown={handleChatSidebarMouseDown}
            />
            
            <div style={{ 
              padding: '15px 20px', 
              borderBottom: '1px solid rgba(123, 104, 238, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>AI Assistant</h3>
              <button
                onClick={() => setChatOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b3b3b7',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  padding: '0 5px'
                }}
              >
                ×
              </button>
            </div>
            
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.sender === 'user' ? 'user-message' : 'ai-message'}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' 
                      ? 'rgba(123, 104, 238, 0.3)' 
                      : msg.isError 
                        ? 'rgba(255, 99, 71, 0.2)' 
                        : 'rgba(30, 27, 38, 0.7)',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                  }}
                >
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ))}
              {isLoading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(30, 27, 38, 0.7)',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    maxWidth: '80%'
                  }}
                >
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>.</span>
                    <span style={{ animation: 'pulse 1s infinite 0.2s' }}>.</span>
                    <span style={{ animation: 'pulse 1s infinite 0.4s' }}>.</span>
                  </div>
                  <style>{`
                    @keyframes pulse {
                      0% { opacity: 0.4; }
                      50% { opacity: 1; }
                      100% { opacity: 0.4; }
                    }
                  `}</style>
                </div>
              )}
            </div>
            
            <div style={{ 
              padding: '15px',
              borderTop: '1px solid rgba(123, 104, 238, 0.3)'
            }}>
              <div style={{ 
                display: 'flex',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'rgba(30, 27, 38, 0.7)',
                border: '1px solid rgba(123, 104, 238, 0.3)'
              }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about your scene..."
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    padding: '12px 15px',
                    resize: 'none',
                    minHeight: '50px',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  style={{
                    background: 'rgba(123, 104, 238, 0.5)',
                    border: 'none',
                    color: 'white',
                    padding: '0 15px',
                    cursor: isLoading || !message.trim() ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !message.trim() ? 0.7 : 1
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </ChatSidebar>
        )}
      </MainContent>
    </ViewerContainer>
  );
}

export default ModelViewer;