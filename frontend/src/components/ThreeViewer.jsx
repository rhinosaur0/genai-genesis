import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, PerspectiveCamera, Grid } from '@react-three/drei';
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
  color: var(--color-text);
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
`;

const SpinnerContainer = styled.div`
  display: inline-block;
  width: 50px;
  height: 50px;
  border: 3px solid rgba(123, 104, 238, 0.3);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Dynamic model component that adapts to the provided URL
function Model({ url, setIsLoading }) {
  const group = useRef();
  
  // For demo purposes, as we don't have a real GLB, create a sphere
  const { scene } = useThree();
  
  React.useEffect(() => {
    // Create a placeholder model (sphere) for demonstration
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: '#7b68ee',
      metalness: 0.3,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    if (group.current) {
      group.current.add(mesh);
    }
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [setIsLoading]);
  
  // In a real implementation, you would use:
  // const { scene, nodes, materials } = useGLTF(url)
  // useEffect(() => { setIsLoading(false) }, [scene])
  
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.001;
    }
  });
  
  return <group ref={group} />;
}

function ThreeViewer({ modelUrl }) {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <CanvasContainer>
      {isLoading && (
        <LoadingOverlay>
          <h3>Loading Model</h3>
          <SpinnerContainer />
        </LoadingOverlay>
      )}
      
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Model url={modelUrl} setIsLoading={setIsLoading} />
        
        <Grid
          infiniteGrid
          cellSize={0.6}
          cellThickness={0.6}
          cellColor="#6a5acd"
          sectionSize={3}
          sectionThickness={1}
          sectionColor="#7b68ee"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          position={[0, -2, 0]}
        />
        
        <Environment preset="city" />
        <OrbitControls makeDefault />
      </Canvas>
    </CanvasContainer>
  );
}

export default ThreeViewer; 