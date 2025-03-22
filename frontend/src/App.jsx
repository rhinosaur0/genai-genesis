import React, { useState } from 'react';
import styled from 'styled-components';
import LandingPage from './pages/LandingPage';
import ModelViewer from './pages/ModelViewer';

const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [modelData, setModelData] = useState(null);
  
  const handleUploadSuccess = (data) => {
    setModelData(data);
    setCurrentPage('viewer');
  };
  
  return (
    <AppContainer>
      {currentPage === 'landing' && (
        <LandingPage onUploadSuccess={handleUploadSuccess} />
      )}
      
      {currentPage === 'viewer' && (
        <ModelViewer modelData={modelData} />
      )}
    </AppContainer>
  );
}

export default App; 