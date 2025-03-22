import React, { useState } from 'react';
import styled from 'styled-components';

const LandingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 4rem 2rem;
  position: relative;
  background: radial-gradient(circle at 50% 50%, rgba(123, 104, 238, 0.1), rgba(0, 0, 0, 0.1));
`;

const BackgroundLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
  opacity: 0.15;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 20px,
      var(--color-primary) 20px,
      var(--color-primary) 21px
    );
  }
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 20px,
      var(--color-primary) 20px,
      var(--color-primary) 21px
    );
  }
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--color-primary), #9370db);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-bottom: 3rem;
  text-align: center;
  max-width: 600px;
`;

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 2rem;
  margin-bottom: 2rem;
  gap: 1.5rem;
  border-radius: 16px;
  background: var(--color-card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-soft);
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-text);
`;

const FileUploadArea = styled.div`
  border: 2px dashed var(--color-card-border);
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(123, 104, 238, 0.05);
  
  &:hover {
    border-color: var(--color-primary);
    background: rgba(123, 104, 238, 0.1);
  }
  
  p {
    color: var(--color-text-secondary);
    margin-top: 1rem;
  }
`;

const PromptInput = styled.textarea`
  width: 100%;
  padding: 1rem;
  background-color: rgba(30, 27, 38, 0.5);
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  color: var(--color-text);
  resize: vertical;
  min-height: 120px;
  font-family: 'Montserrat', sans-serif;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(to right, var(--color-primary), var(--color-secondary));
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  &:disabled {
    background: gray;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const FileInputHidden = styled.input`
  display: none;
`;

const FileName = styled.div`
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--color-primary);
`;

function LandingPage({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !prompt) return;
    
    setIsUploading(true);
    
    // In a real application, you would upload the file and prompt to your backend here
    // For this example, we'll simulate success after a delay
    
    setTimeout(() => {
      // Pass the data to the parent component
      onUploadSuccess({
        file: selectedFile,
        prompt: prompt,
        // In a real app, this would be the model URL returned from your backend
        modelUrl: URL.createObjectURL(selectedFile) 
      });
      
      setIsUploading(false);
    }, 1500);
  };
  
  return (
    <LandingContainer>
      <BackgroundLines />
      
      <Title>3D Model Studio</Title>
      <Subtitle>
        Upload an image and a prompt to create an interactive 3D model with AI-powered chat assistance
      </Subtitle>
      
      <UploadContainer>
        <UploadForm onSubmit={handleSubmit}>
          <FormTitle>Create Your 3D Model</FormTitle>
          
          <label htmlFor="file-upload">
            <FileUploadArea 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p>Drag & drop an image or click to browse</p>
              {selectedFile && <FileName>{selectedFile.name}</FileName>}
            </FileUploadArea>
            <FileInputHidden 
              id="file-upload"
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
          
          <div>
            <FormTitle>Describe your desired 3D model</FormTitle>
            <PromptInput
              placeholder="Example: A highly detailed red dragon with iridescent scales and large wings in T-pose..."
              value={prompt}
              onChange={handlePromptChange}
            />
          </div>
          
          <SubmitButton 
            type="submit" 
            disabled={!selectedFile || !prompt || isUploading}
          >
            {isUploading ? 'Processing...' : 'Generate 3D Model'}
          </SubmitButton>
        </UploadForm>
      </UploadContainer>
    </LandingContainer>
  );
}

export default LandingPage; 