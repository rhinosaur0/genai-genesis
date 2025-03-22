import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ViewerContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  background-color: #13111a;
  color: white;
  overflow: hidden;
`;

const MainContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  width: 350px;
  height: 100%;
  background: rgba(25, 22, 34, 0.8);
  border-left: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(123, 104, 238, 0.3);
  text-align: center;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Message = styled.div`
  max-width: 85%;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${props => props.isUser ? 'rgba(123, 104, 238, 0.3)' : 'rgba(30, 27, 38, 0.7)'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`;

const ChatInput = styled.div`
  padding: 15px;
  border-top: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 16px;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 20px;
  color: white;
  outline: none;
  
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

function ModelViewer({ modelData, onBack }) {
  const [viewerMode, setViewerMode] = useState('view');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your AI assistant. How can I help you with your 3D model?", isUser: false }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isModelGenerated, setIsModelGenerated] = useState(false);
  const [particles, setParticles] = useState([]);
  const threeJSRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  
  // Generate random particles for the dynamic background
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 20 + 10 + 's',
        delay: Math.random() * 5 + 's'
      });
    }
    setParticles(newParticles);
  }, []);
  
  // Set up Three.js scene
  useEffect(() => {
    if (!threeJSRef.current) return;
    
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
      threeJSRef.current.clientWidth / threeJSRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 4);
    
    // Add renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threeJSRef.current.clientWidth, threeJSRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    threeJSRef.current.appendChild(renderer.domElement);
    
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
      if (!threeJSRef.current) return;
      
      camera.aspect = threeJSRef.current.clientWidth / threeJSRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(threeJSRef.current.clientWidth, threeJSRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      threeJSRef.current?.removeChild(renderer.domElement);
      scene.clear();
    };
  }, [isModelGenerated]);
  
  useEffect(() => {
    if (modelData && modelData.prompt) {
      // Add initial contextual message based on the prompt
      const initialMessage = {
        text: `I've analyzed your prompt: "${modelData.prompt}". What aspects of this 3D model would you like to discuss?`,
        isUser: false
      };
      setMessages(prev => [...prev, initialMessage]);
      
      // Simulate model generation with a delay
      setTimeout(() => {
        setIsModelGenerated(true);
      }, 3000);
    }
  }, [modelData]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    // Add user message
    const userMessage = { text: messageInput, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    
    // Simulate AI response
    setTimeout(() => {
      let response = "I'm processing your request about the 3D model...";
      
      if (messageInput.toLowerCase().includes("how") || messageInput.toLowerCase().includes("what")) {
        response = "That's a great question! The 3D model is generated based on your prompt and reference image. The details you provided help shape the final result.";
      } else if (messageInput.toLowerCase().includes("change") || messageInput.toLowerCase().includes("modify")) {
        response = "To modify your model, you can switch to the 'Edit' mode using the toolbar at the top. From there, you can make adjustments to various aspects.";
      } else if (messageInput.toLowerCase().includes("help") || messageInput.toLowerCase().includes("guide")) {
        response = "I'm here to help! You can explore your model in 'View' mode, make changes in 'Edit' mode, or train special behaviors in 'Train' mode. What would you like to know more about?";
      }
      
      const aiMessage = { text: response, isUser: false };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };
  
  const getModeDescription = () => {
    switch(viewerMode) {
      case 'edit': return 'Edit Mode: Modify your 3D model';
      case 'train': return 'Train Mode: Teach your model new behaviors';
      default: return 'View Mode: Explore your 3D model';
    }
  };

  if (!modelData) {
    return (
      <ViewerContainer>
        <MainContent>
          <BackButton onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Upload
          </BackButton>
          <ViewerFrame>
            <div style={{ textAlign: 'center' }}>
              <h2>Error: No Model Data</h2>
              <p>No model data was provided. Please go back and upload a model.</p>
            </div>
          </ViewerFrame>
        </MainContent>
      </ViewerContainer>
    );
  }
  
  return (
    <ViewerContainer>
      <MainContent>
        <BackButton onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Upload
        </BackButton>
        
        <ViewerToolbar>
          <ToolbarButton 
            active={viewerMode === 'view'} 
            onClick={() => setViewerMode('view')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M3 12c4-6 14-6 18 0-4 6-14 6-18 0z"/>
            </svg>
            View
          </ToolbarButton>
          
          <ToolbarButton 
            active={viewerMode === 'edit'} 
            onClick={() => setViewerMode('edit')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </ToolbarButton>
          
          <ToolbarButton 
            active={viewerMode === 'train'} 
            onClick={() => setViewerMode('train')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v6m0 12v2"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M16.24 7.76l-2.12 2.12m-4.24 4.24l-2.12 2.12"/>
              <path d="M7.76 7.76l2.12 2.12m4.24 4.24l2.12 2.12"/>
            </svg>
            Train
          </ToolbarButton>
          
          <ToolbarButton 
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </ToolbarButton>
        </ViewerToolbar>
        
        <ViewerFrame>
          {/* Background decorative elements */}
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
          
          <InfoCard>
            <h3>Model Details</h3>
            <p><strong>Prompt:</strong> {modelData.prompt}</p>
            <p><strong>Mode:</strong> {viewerMode.charAt(0).toUpperCase() + viewerMode.slice(1)}</p>
          </InfoCard>
          
          <ThreeJSContainer ref={threeJSRef}>
            {!isModelGenerated && (
              <ModelGeneratingScreen>
                <h3>Generating Your 3D Model</h3>
                <p>Creating a 3D model based on your prompt...</p>
                <GeneratingIndicator>
                  <span></span>
                  <span></span>
                  <span></span>
                </GeneratingIndicator>
              </ModelGeneratingScreen>
            )}
          </ThreeJSContainer>
          
          <ModeIndicator>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#7b68ee" stroke="none">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            {getModeDescription()}
          </ModeIndicator>
          
          <ModelStatus>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#4CAF50" stroke="none">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            {isModelGenerated ? 'Model Ready' : 'Generating Model...'}
          </ModelStatus>
        </ViewerFrame>
      </MainContent>
      
      {isChatOpen && (
        <ChatSidebar>
          <ChatHeader>
            <h3>AI Assistant</h3>
          </ChatHeader>
          
          <ChatMessages>
            {messages.map((message, index) => (
              <Message key={index} isUser={message.isUser}>
                {message.text}
              </Message>
            ))}
          </ChatMessages>
          
          <ChatInput>
            <Input 
              placeholder="Ask me about your 3D model..." 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <SendButton onClick={handleSendMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13"/>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </SendButton>
          </ChatInput>
        </ChatSidebar>
      )}
    </ViewerContainer>
  );
}

export default ModelViewer; 