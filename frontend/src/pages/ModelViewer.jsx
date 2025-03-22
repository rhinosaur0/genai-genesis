import React, { useState } from 'react';
import styled from 'styled-components';
import ThreeViewer from '../components/ThreeViewer';
import ChatSidebar from '../components/ChatSidebar';
import ViewerToolbar from '../components/ViewerToolbar';

const ViewerContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  background-color: var(--color-background);
`;

const MainContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const ModeIndicator = styled.div`
  position: absolute;
  bottom: 1.5rem;
  left: 1.5rem;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  z-index: 10;
  
  span.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-primary);
  }
`;

const InfoButton = styled.button`
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: var(--color-text);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  &:hover {
    background: var(--color-translucent);
  }
`;

function ModelViewer({ modelData }) {
  const [viewerMode, setViewerMode] = useState('view');
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  const getModeDescription = () => {
    switch(viewerMode) {
      case 'edit': return 'Modify and refine your 3D model';
      case 'train': return 'Train your model with custom behaviors';
      default: return 'Explore your 3D model from all angles';
    }
  };
  
  return (
    <ViewerContainer>
      <MainContent>
        <ThreeViewer modelUrl={modelData?.modelUrl} />
        
        <ViewerToolbar 
          currentMode={viewerMode} 
          setCurrentMode={setViewerMode} 
        />
        
        <ModeIndicator>
          <span className="dot"></span>
          {getModeDescription()}
        </ModeIndicator>
        
        <InfoButton onClick={() => setIsChatOpen(!isChatOpen)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </InfoButton>
      </MainContent>
      
      {isChatOpen && (
        <ChatSidebar modelPrompt={modelData?.prompt} />
      )}
    </ViewerContainer>
  );
}

export default ModelViewer; 