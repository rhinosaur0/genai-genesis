import React from 'react';
import styled from 'styled-components';

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 20px 0;
`;

const PreviewFrame = styled.div`
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  border-radius: 12px;
  border: 1px solid rgba(123, 104, 238, 0.5);
  overflow: hidden;
  background: rgba(30, 27, 38, 0.7);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
`;

const ImageContainer = styled.div`
  width: 100%;
  padding-top: 10px;
  display: flex;
  justify-content: center;
`;

const PreviewImage = styled.img`
  max-width: 95%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
`;

const PreviewHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid rgba(123, 104, 238, 0.3);
`;

const PreviewTitle = styled.h3`
  margin: 0;
  color: #f5f5f7;
  font-size: 1.2rem;
  text-align: center;
`;

const PreviewFooter = styled.div`
  padding: 15px;
  display: flex;
  justify-content: center;
`;

const ContinueButton = styled.button`
  background-color: #7b68ee;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
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
`;

/**
 * A component that displays a base64 encoded image received from the backend
 * @param {Object} props
 * @param {string} props.base64Image - Base64 encoded image string
 * @param {string} props.title - Title to display above the image
 * @param {function} props.onContinue - Function to call when continue button is clicked
 */
const RenderPreview = ({ base64Image, title = "AI Generated Preview", onContinue }) => {
  if (!base64Image) {
    return null;
  }

  return (
    <PreviewContainer>
      <PreviewFrame>
        <PreviewHeader>
          <PreviewTitle>{title}</PreviewTitle>
        </PreviewHeader>
        <ImageContainer>
          <PreviewImage src={base64Image} alt={title} />
        </ImageContainer>
        <PreviewFooter>
          <ContinueButton onClick={onContinue}>
            Continue
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </ContinueButton>
        </PreviewFooter>
      </PreviewFrame>
    </PreviewContainer>
  );
};

export default RenderPreview; 