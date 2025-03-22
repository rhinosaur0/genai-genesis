import React from 'react';

function PureTest() {
  return (
    <div style={{ 
      backgroundColor: '#13111a', 
      color: 'white', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      flexDirection: 'column',
      padding: '20px'
    }}>
      <h1 style={{ color: '#7b68ee', marginBottom: '20px' }}>Test Component</h1>
      <p>If you can see this text, React is rendering correctly!</p>
      <button 
        style={{ 
          marginTop: '20px', 
          backgroundColor: '#7b68ee', 
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          color: 'white',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button works!')}
      >
        Click Me
      </button>
    </div>
  );
}

export default PureTest; 