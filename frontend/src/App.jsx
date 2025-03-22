import React, { useState } from 'react';
import styled from 'styled-components';
import LandingPage from './pages/LandingPage';
import ModelViewer from './pages/ModelViewer';

const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #13111a;
`;

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [modelData, setModelData] = useState(null);
  
  const handleUploadSuccess = (data) => {
    setModelData(data);
    setCurrentPage('viewer');
  };
  
  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };
  
  let content = null;
  
  // Determine which page to show
  if (currentPage === 'landing') {
    content = <LandingPage onUploadSuccess={handleUploadSuccess} />;
  } else if (currentPage === 'viewer') {
    content = <ModelViewer modelData={modelData} onBack={handleBackToLanding} />;
  } else {
    // Fallback for unexpected state
    content = (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>Something went wrong</h1>
        <p>Invalid page state: {currentPage}</p>
        <button 
          onClick={() => setCurrentPage('landing')}
          style={{
            marginTop: '20px',
            backgroundColor: '#7b68ee',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Go to Homepage
        </button>
      </div>
    );
  }
  
  return <AppContainer>{content}</AppContainer>;
}

export default App; 