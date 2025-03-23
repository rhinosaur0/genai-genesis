import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../utils/AuthContext';
import { getUserEnvironments, createEnvironment, deleteEnvironment } from '../utils/firebase';
import axios from 'axios';

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
  const { currentUser, logout } = useAuth();
  
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
          filename: selectedImage.name,
          uid: currentUser.uid
        };
        
        // Make the POST request to the backend
        const uploadResponse = await axios.post('http://localhost:8000/upload_filename', filenamePayload);
        
        if (uploadResponse.data.status === 'success') {
          console.log("Filename upload successful:", uploadResponse.data);
        } else {
          console.warn("Filename upload returned error:", uploadResponse.data);
        }
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
            <ProjectCard key={project.id} onClick={() => onSelectProject(project)}>
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
    </GalleryContainer>
  );
};

export default ProjectGallery; 