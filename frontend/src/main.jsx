import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './utils/firebase'; // Import Firebase config to ensure it's initialized

console.log('Initializing app...');

try {
  console.log('Finding root element...');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Root element not found!');
    // Create a fallback element
    const fallbackElement = document.createElement('div');
    fallbackElement.id = 'root';
    document.body.appendChild(fallbackElement);
    console.log('Created fallback root element');
    
    ReactDOM.createRoot(fallbackElement).render(<App />);
  } else {
    console.log('Root element found, mounting React app');
    ReactDOM.createRoot(rootElement).render(<App />);
  }
} catch (error) {
  console.error('Error mounting React app:', error);
  document.body.innerHTML = `
    <div style="color: white; padding: 20px; text-align: center;">
      <h1>Something went wrong</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    </div>
  `;
} 