import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import askGemini from '../utils/geminiApi';
import ReactMarkdown from 'react-markdown';

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
  min-width: ${props => props.isOpen ? '150px' : '40px'};
  max-width: ${props => props.isOpen ? '400px' : '40px'};
  background-color: #191622;
  transition: ${props => props.isDragging ? 'none' : 'width 0.3s ease'};
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
  display: ${props => props.isOpen ? 'block' : 'none'};
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
  width: calc(100% - ${props => props.sidebarOpen ? props.width : '40px'});
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
  background: ${props => props.active ? 'rgba(123, 104, 238, 0.8)' : 'rgba(30, 27, 38, 0.7)'};
  color: white;
  border: 1px solid ${props => props.active ? 'rgba(123, 104, 238, 0.8)' : 'rgba(123, 104, 238, 0.3)'};
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  
  &:hover {
    background: ${props => props.active ? 'rgba(123, 104, 238, 0.9)' : 'rgba(123, 104, 238, 0.4)'};
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
  transition: ${props => props.isDragging ? 'none' : 'transform 0.3s ease'};
  position: fixed;
  top: 0;
  right: 0;
  z-index: 90;
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
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
  
  return { width, isDragging, handleMouseDown };
}

function ModelViewer({ modelData, onBack }) {
  const [activeMode, setActiveMode] = useState('view');
  const [showInfo, setShowInfo] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant. Ask me anything about this 3D model or how to interact with it.", isUser: false }
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the custom hook for sidebar and chat sidebar
  const sidebar = useDraggableWidth(250, 150, 400);
  const chatSidebar = useDraggableWidth(350, 250, 600);
  
  const containerRef = useRef(null);
  const threeRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const [particles, setParticles] = useState([]);
  
  // Auto resize chat input as text changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [chatInput]);
  
  // Generate random particles for background
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.4 + 0.1,
        color: i % 5 === 0 ? '#9370db' : '#7b68ee',
        speed: `${Math.random() * 20 + 10}s`,
        delay: `${Math.random() * 5}s`
      });
    }
    setParticles(newParticles);
  }, []);
  
  useEffect(() => {
    // Scroll to bottom of chat when messages change
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // Set up Three.js scene
  useEffect(() => {
    if (!threeRef.current) return;
    
    // Set up scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x13111a);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Add camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      threeRef.current.clientWidth / threeRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 4);
    
    // Add renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threeRef.current.clientWidth, threeRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    threeRef.current.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controlsRef.current = controls;
    
    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorTexture = new THREE.TextureLoader().load('/floor-texture.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(8, 8);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: floorTexture,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Add sample cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7b68ee,
      roughness: 0.5,
      metalness: 0.5
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.y = 0;
    cube.castShadow = true;
    scene.add(cube);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (cube) {
        cube.rotation.y += 0.005;
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!threeRef.current) return;
      
      camera.aspect = threeRef.current.clientWidth / threeRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(threeRef.current.clientWidth, threeRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      threeRef.current?.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);
  
  // Updated message handler to use Gemini API
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    // Format user message for display - convert triple quotes to markdown code blocks
    let formattedUserInput = chatInput;
    if (chatInput.includes("'''")) {
      formattedUserInput = chatInput.replace(/'''\s*([\s\S]*?)\s*'''/g, '```\n$1\n```');
    }
    
    // Add user message to chat
    const userMessage = {
      id: chatMessages.length + 1,
      text: formattedUserInput,
      isUser: true
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);
    
    try {
      // Use the utility function instead of implementing the API call here
      const aiResponse = await askGemini(chatInput); // Send original input to API
      
      // Format AI response - convert triple quotes to markdown code blocks
      let formattedResponse = aiResponse;
      if (aiResponse.includes("'''")) {
        formattedResponse = aiResponse.replace(/'''\s*([\s\S]*?)\s*'''/g, '```\n$1\n```');
      }
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        text: formattedResponse,
        isUser: false
      }]);
    } catch (error) {
      console.error('Error processing request:', error);
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Sorry, there was an error processing your request.",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update handleKeyPress to support Shift+Enter for new lines
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const getModeDescription = () => {
    switch(activeMode) {
      case 'edit': return 'Edit Mode: Modify your 3D model';
      case 'train': return 'Train Mode: Teach your model new behaviors';
      default: return 'View Mode: Explore your 3D model';
    }
  };

  // Handle sidebar button actions
  const handleEditButton = () => {
    setActiveMode('edit');
    // Additional edit logic can go here
  };
  
  const handleViewButton = () => {
    setActiveMode('view');
    // Additional view logic can go here
  };
  
  const handleTrainButton = () => {
    setActiveMode('train');
    // Additional train logic can go here
  };
  
  return (
    <ViewerContainer ref={containerRef}>
      {/* Left Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        width={sidebarOpen ? sidebar.width : 40} 
        isDragging={sidebar.isDragging}
      >
        <SidebarToggle onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </SidebarToggle>
        <SidebarContent isOpen={sidebarOpen}>
          <h3>Tools</h3>
          <ActionButton onClick={handleEditButton}>Edit</ActionButton>
          <ActionButton onClick={handleViewButton}>View</ActionButton>
          <ActionButton onClick={handleTrainButton}>Train</ActionButton>
          <ActionButton onClick={() => setIsChatOpen(!isChatOpen)}>
            {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </ActionButton>
          <ActionButton onClick={onBack}>Back to Home</ActionButton>
          
          <h3 style={{ marginTop: '30px' }}>Mode Details</h3>
          <div style={{ fontSize: '14px', color: '#cccccc', lineHeight: '1.5' }}>
            {getModeDescription()}
          </div>
        </SidebarContent>
        {/* Resize handle for sidebar */}
        {sidebarOpen && (
          <ResizeHandle 
            style={{ right: '-4px' }}
            onMouseDown={sidebar.handleMouseDown}
          />
        )}
      </Sidebar>
      
      {/* Main Content */}
      <MainContent sidebarOpen={sidebarOpen} style={{ width: `calc(100% - ${sidebarOpen ? sidebar.width : 40}px)` }}>
        <ViewerFrame>
          <BackgroundGradient />
          
          {particles.map(particle => (
            <FloatingParticle 
              key={particle.id}
              size={particle.size}
              left={particle.left}
              top={particle.top}
              opacity={particle.opacity}
              color={particle.color}
              speed={particle.speed}
              delay={particle.delay}
            />
          ))}
          
          <ThreeJSContainer ref={threeRef} />
          
          <ViewerToolbar>
            <ToolbarButton 
              active={activeMode === 'view'} 
              onClick={() => setActiveMode('view')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              </svg>
              View
            </ToolbarButton>
            
            <ToolbarButton 
              active={activeMode === 'edit'} 
              onClick={() => setActiveMode('edit')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </ToolbarButton>
            
            <ToolbarButton 
              active={activeMode === 'train'} 
              onClick={() => setActiveMode('train')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Train
            </ToolbarButton>
            
            <ToolbarButton 
              onClick={() => setShowInfo(!showInfo)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8" />
              </svg>
              {showInfo ? 'Hide Info' : 'Show Info'}
            </ToolbarButton>
            
            <ToolbarButton 
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {isChatOpen ? 'Hide Chat' : 'Show Chat'}
            </ToolbarButton>
          </ViewerToolbar>
          
          <ModeIndicator>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {activeMode === 'view' && <><circle cx="12" cy="12" r="3" /><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /></>}
              {activeMode === 'edit' && <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>}
              {activeMode === 'train' && <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>}
            </svg>
            Mode: {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}
          </ModeIndicator>
          
          {/* Floating chat button when chat is hidden */}
          {!isChatOpen && (
            <ChatToggleButton onClick={() => setIsChatOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            </ChatToggleButton>
          )}
        </ViewerFrame>
      </MainContent>
      
      {/* Chat Sidebar - conditionally rendered */}
      {isChatOpen && (
        <ChatSidebar 
          width={chatSidebar.width} 
          isDragging={chatSidebar.isDragging}
        >
          {/* Resize handle for chat sidebar */}
          <ResizeHandle 
            style={{ left: '-4px' }}
            onMouseDown={chatSidebar.handleMouseDown}
          />
          <ChatHeader>
            <h3>AI Assistant</h3>
            <CloseButton onClick={() => setIsChatOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </CloseButton>
          </ChatHeader>
          <ChatMessages>
            {chatMessages.map(msg => (
              <Message key={msg.id} isUser={msg.isUser}>
                <ReactMarkdown>
                  {msg.text}
                </ReactMarkdown>
              </Message>
            ))}
            {isLoading && (
              <Message isUser={false} style={{ background: 'transparent', display: 'flex', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 0.5s' }}></div>
                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 1s' }}></div>
              </Message>
            )}
            <div ref={chatEndRef} />
          </ChatMessages>
          <ChatInput>
            <Input 
              ref={inputRef}
              placeholder="Ask me anything... (Shift+Enter for new line, use ''' for code)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
            />
            <SendButton onClick={handleSendMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </SendButton>
          </ChatInput>
        </ChatSidebar>
      )}
    </ViewerContainer>
  );
}

export default ModelViewer; 