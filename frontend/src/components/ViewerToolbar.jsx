import React from 'react';
import styled from 'styled-components';

const ToolbarContainer = styled.div`
  position: absolute;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 12px;
  z-index: 10;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  background-color: ${props => props.active ? '#7b68ee' : 'transparent'};
  color: ${props => props.active ? 'white' : '#f5f5f7'};
  cursor: pointer;
  border: none;
  
  &:hover {
    background-color: ${props => props.active ? '#7b68ee' : 'rgba(123, 104, 238, 0.15)'};
  }
`;

const ButtonIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

function ViewerToolbar({ currentMode, setCurrentMode }) {
  return (
    <ToolbarContainer>
      <ButtonGroup>
        <ToolbarButton 
          active={currentMode === 'view'} 
          onClick={() => setCurrentMode('view')}
        >
          <ButtonIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </ButtonIcon>
          View Mode
        </ToolbarButton>
        
        <ToolbarButton 
          active={currentMode === 'edit'} 
          onClick={() => setCurrentMode('edit')}
        >
          <ButtonIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </ButtonIcon>
          Edit Mode
        </ToolbarButton>
        
        <ToolbarButton 
          active={currentMode === 'train'} 
          onClick={() => setCurrentMode('train')}
        >
          <ButtonIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="9" r="5"></circle>
              <path d="M15 5l4 4"></path>
              <path d="M18.5 8.5a2.5 2.5 0 0 1 0 3.5L9 21l-4-4L14.5 7.5a2.5 2.5 0 0 1 3.5 0z"></path>
            </svg>
          </ButtonIcon>
          Train Mode
        </ToolbarButton>
      </ButtonGroup>
    </ToolbarContainer>
  );
}

export default ViewerToolbar; 