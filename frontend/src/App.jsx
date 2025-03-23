import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LandingPage from './pages/LandingPage';
import ModelViewer from './pages/ModelViewer';
import ProjectGallery from './components/ProjectGallery';
import { AuthProvider, useAuth } from './utils/AuthContext';

const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #13111a;
  overflow-y: auto;
`;

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      console.error('Global error caught:', error);
      setHasError(true);
      setError(error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        background: '#13111a',
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>Something went wrong</h1>
        <p>An error occurred in the application. Please refresh the page and try again.</p>
        {error && (
          <div style={{ 
            maxWidth: '80%', 
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            color: '#ff6b6b',
            textAlign: 'left',
            overflow: 'auto'
          }}>
            <p><strong>Error:</strong> {error.toString()}</p>
          </div>
        )}
        <button 
          onClick={() => window.location.reload()}
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
          Refresh Page
        </button>
      </div>
    );
  }

  return children;
};

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [modelData, setModelData] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const { currentUser, loading, error } = useAuth();
  
  useEffect(() => {
    console.log("AppContent - Auth state:", { 
      currentUser: currentUser ? `User: ${currentUser.uid}` : "No user", 
      loading, 
      error 
    });
  }, [currentUser, loading, error]);
  
  const handleUploadSuccess = (data) => {
    console.log("Upload success:", data);
    setModelData(data);
    setCurrentPage('viewer');
  };
  
  const handleBackToLanding = () => {
    console.log("Navigating back to landing/gallery");
    setCurrentPage(currentUser ? 'gallery' : 'landing');
  };
  
  const handleSelectProject = (project) => {
    console.log("Project selected:", project);
    setSelectedProject(project);
    // Create a model data object from the project data
    setModelData({
      model: project.model_url,
      prompt: project.description || ''
    });
    setCurrentPage('viewer');
  };
  
  // When user logs in, show gallery instead of landing
  useEffect(() => {
    if (currentUser && currentPage === 'landing') {
      console.log("User is logged in, redirecting to gallery");
      setCurrentPage('gallery');
    }
  }, [currentUser, currentPage]);
  
  // If still loading auth state, show a loading indicator
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#13111a',
        color: 'white'
      }}>
        <h2>Initializing app...</h2>
      </div>
    );
  }
  
  // If there's an auth error, display it
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        background: '#13111a',
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
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
          Refresh Page
        </button>
      </div>
    );
  }
  
  let content = null;
  
  // Determine which page to show
  if (currentPage === 'landing') {
    console.log("Rendering landing page");
    content = <LandingPage onUploadSuccess={handleUploadSuccess} />;
  } else if (currentPage === 'gallery') {
    console.log("Rendering gallery page");
    content = <ProjectGallery onSelectProject={handleSelectProject} />;
  } else if (currentPage === 'viewer') {
    console.log("Rendering model viewer page");
    content = (
      <ModelViewer 
        modelData={modelData} 
        onBack={handleBackToLanding} 
        projectData={selectedProject}
      />
    );
  } else {
    // Fallback for unexpected state
    console.error("Invalid page state:", currentPage);
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
  
  return content;
};

function App() {
  console.log("App component rendering");
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContainer>
          <AppContent />
        </AppContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 