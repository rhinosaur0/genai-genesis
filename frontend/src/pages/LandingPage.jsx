import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import AuthForm from '../components/AuthForm';
import { Button } from '../components/AuthForm';
import { useAuth } from '../utils/AuthContext';

const LandingContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  background-color: #13111a;
  color: white;
  overflow-y: auto;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 700;
  color: #7b68ee;
  position: relative;
  z-index: 2;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #b3b3b7;
  margin-bottom: 3rem;
  text-align: center;
  max-width: 600px;
  position: relative;
  z-index: 2;
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  padding: 2rem;
  margin-bottom: 2rem;
  gap: 1.5rem;
  border-radius: 16px;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  position: relative;
  z-index: 5;
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #f5f5f7;
`;

const FileUploadArea = styled.div`
  border: 2px dashed rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(123, 104, 238, 0.05);
  
  p {
    color: #b3b3b7;
    margin-top: 1rem;
  }
`;

const PromptInput = styled.textarea`
  width: 100%;
  padding: 1rem;
  background-color: rgba(30, 27, 38, 0.5);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  color: #f5f5f7;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #7b68ee;
  }
`;

const SubmitButton = styled.button`
  background-color: #7b68ee;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    background: gray;
    cursor: not-allowed;
  }
`;

const FileInputHidden = styled.input`
  display: none;
`;

const FileName = styled.div`
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #7b68ee;
`;

// Enhanced animated background
const floatAnimation = keyframes`
  0% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0) rotate(0); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 0.4; }
`;

const rotateAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const BackgroundGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 70% 20%, rgba(123, 104, 238, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 30% 70%, rgba(123, 104, 238, 0.2) 0%, transparent 40%);
  z-index: -10;
`;

const BackgroundShape = styled.div`
  position: absolute;
  background: ${props => props.gradient || 'linear-gradient(135deg, #7b68ee 0%, #5546e4 100%)'};
  border-radius: ${props => props.radius || '50%'};
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  left: ${props => props.left}%;
  top: ${props => props.top}%;
  opacity: ${props => props.opacity || 0.3};
  filter: blur(${props => props.blur || 0}px);
  z-index: -5;
  animation: ${props => props.float ? floatAnimation : props.pulse ? pulseAnimation : props.rotate ? rotateAnimation : 'none'} 
             ${props => props.duration || '8s'} 
             ease-in-out 
             ${props => props.delay || '0s'} 
             infinite 
             ${props => props.alternate ? 'alternate' : ''};
`;

const BackgroundGrid = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(123, 104, 238, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(123, 104, 238, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: -8;
  opacity: 0.3;
`;

const FloatingParticle = styled.div`
  position: absolute;
  width: ${props => props.size || 4}px;
  height: ${props => props.size || 4}px;
  background-color: ${props => props.color || '#7b68ee'};
  opacity: ${props => props.opacity || 0.6};
  border-radius: 50%;
  z-index: -2;
  left: ${props => props.left}%;
  top: ${props => props.top}%;
  animation: ${pulseAnimation} ${props => props.duration || '3s'} infinite alternate ease-in-out,
             ${floatAnimation} ${props => props.speed || '15s'} infinite alternate-reverse ease-in-out;
  animation-delay: ${props => props.delay || '0s'};
  pointer-events: none;
`;

const ImagePreviewContainer = styled.div`
  margin-top: 1rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ImagePreview = styled.img`
  max-width: 300px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  object-fit: contain;
  margin-top: 1rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

function LandingPage({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [particles, setParticles] = useState([]);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const { currentUser, logout } = useAuth();
  
  // Generate random particles
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 4 + 2 + 's',
        speed: Math.random() * 20 + 10 + 's',
        delay: Math.random() * 5 + 's'
      });
    }
    setParticles(newParticles);
  }, []);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    // Simulate uploading and processing delay
    setTimeout(() => {
      // In a real app, you'd send the file and prompt to your backend here
      
      // For now, just pass the data to the parent component
      onUploadSuccess({
        model: '/models/sample.obj', // Hardcoded for now
        prompt: prompt
      });
      
      // Reset form
      setIsUploading(false);
      setSelectedFile(null);
      setImagePreview(null);
      setPrompt('');
    }, 2000);
  };
  
  const openAuthForm = (mode) => {
    setAuthMode(mode);
    setShowAuthForm(true);
  };
  
  const closeAuthForm = () => {
    setShowAuthForm(false);
  };
  
  // User is logged in, show a simplified view
  if (currentUser) {
    return (
      <LandingContainer>
        <BackgroundGradient />
        <BackgroundGrid />
        
        {particles.map((particle) => (
          <FloatingParticle
            key={particle.id}
            size={particle.size}
            left={particle.left}
            top={particle.top}
            opacity={particle.opacity}
            duration={particle.duration}
            speed={particle.speed}
            delay={particle.delay}
          />
        ))}
        
        <Title>Welcome back to GenAI Genesis</Title>
        <Subtitle>
          Your 3D environment creation platform powered by AI
        </Subtitle>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            onClick={() => onUploadSuccess({
              model: '/models/sample.obj', // Pass the sample model
              prompt: "Sample project"
            })}
            style={{ minWidth: '180px' }}
          >
            Try Sample Model
          </Button>
          
          <Button 
            onClick={logout} 
            style={{ 
              backgroundColor: 'transparent', 
              border: '1px solid rgba(123, 104, 238, 0.5)',
              minWidth: '120px'
            }}
          >
            Logout
          </Button>
        </div>
      </LandingContainer>
    );
  }
  
  // User is not logged in, show the normal landing page
  return (
    <LandingContainer>
      <BackgroundGradient />
      <BackgroundGrid />
      
      {particles.map((particle) => (
        <FloatingParticle
          key={particle.id}
          size={particle.size}
          left={particle.left}
          top={particle.top}
          opacity={particle.opacity}
          duration={particle.duration}
          speed={particle.speed}
          delay={particle.delay}
        />
      ))}
      
      <Title>GenAI Genesis</Title>
      <Subtitle>
        Transform your images into immersive 3D environments with the power of AI
      </Subtitle>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={() => openAuthForm('login')}>
            Log In
          </Button>
          <Button 
            onClick={() => openAuthForm('signup')}
            style={{ 
              backgroundColor: 'transparent', 
              border: '1px solid rgba(123, 104, 238, 0.5)'
            }}
          >
            Sign Up
          </Button>
        </div>
        
        <div>
          <Button 
            onClick={() => onUploadSuccess({
              model: '/models/sample.obj', // Pass the sample model
              prompt: "Sample project"
            })}
            style={{ 
              backgroundColor: 'rgba(123, 104, 238, 0.2)', 
              border: '1px solid rgba(123, 104, 238, 0.3)'
            }}
          >
            Try Demo (No Login Required)
          </Button>
        </div>
      </div>
      
      {showAuthForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <AuthForm 
            mode={authMode} 
            setMode={setAuthMode} 
            onClose={closeAuthForm} 
          />
        </div>
      )}
      
      <BackgroundShape 
        gradient="linear-gradient(135deg, rgba(123, 104, 238, 0.6) 0%, rgba(123, 104, 238, 0.2) 100%)"
        size={300}
        left={75}
        top={20}
        opacity={0.15}
        blur={80}
        float
        duration="25s"
      />
      <BackgroundShape 
        gradient="linear-gradient(135deg, rgba(123, 104, 238, 0.6) 0%, rgba(60, 50, 180, 0.2) 100%)"
        size={400}
        left={10}
        top={70}
        opacity={0.1}
        blur={100}
        float
        duration="30s"
        delay="2s"
      />
    </LandingContainer>
  );
}

export default LandingPage; 