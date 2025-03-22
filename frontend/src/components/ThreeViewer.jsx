import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import styled from 'styled-components';

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(19, 17, 26, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  color: #f5f5f7;
`;

const SpinnerContainer = styled.div`
  display: inline-block;
  width: 50px;
  height: 50px;
  border: 3px solid rgba(123, 104, 238, 0.3);
  border-radius: 50%;
  border-top-color: #7b68ee;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Simple sphere model
function SimpleModel() {
  const meshRef = useRef();
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color="#7b68ee" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function ThreeViewer({ modelUrl }) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <CanvasContainer>
      {isLoading && (
        <LoadingOverlay>
          <h3>Loading Model</h3>
          <SpinnerContainer />
        </LoadingOverlay>
      )}
      
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SimpleModel />
        <OrbitControls />
      </Canvas>
    </CanvasContainer>
  );
}

export default ThreeViewer; 