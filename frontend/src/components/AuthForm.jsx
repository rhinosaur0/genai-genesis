import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../utils/AuthContext';

const AuthContainer = styled.div`
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  border-radius: 16px;
  background: rgba(30, 27, 38, 0.7);
  border: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 5;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
`;

const FormTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: #f5f5f7;
  text-align: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  background-color: rgba(30, 27, 38, 0.5);
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  color: #f5f5f7;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #7b68ee;
  }
`;

export const Button = styled.button`
  background-color: #7b68ee;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #6a5adb;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 104, 238, 0.4);
  }
  
  &:disabled {
    background-color: #48426a;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ToggleButton = styled.button`
  background: transparent;
  color: #7b68ee;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  
  &:hover {
    color: #6a5adb;
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: #b3b3b7;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  
  &:hover {
    background: rgba(123, 104, 238, 0.1);
    color: #f5f5f7;
  }
`;

const AuthForm = ({ mode = 'login', setMode, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, error } = useAuth();

  const toggleForm = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        // If login successful, close the form
        onClose();
      } else {
        await signup(email, password);
        // If signup successful, close the form
        onClose();
      }
    } catch (err) {
      console.error('Authentication error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthContainer>
      {onClose && (
        <CloseButton onClick={onClose}>
          ✕
        </CloseButton>
      )}
      <FormTitle>{mode === 'login' ? 'Log In' : 'Sign Up'}</FormTitle>
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <label htmlFor="email">Email</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </FormGroup>
        
        <FormGroup style={{ marginTop: '1rem' }}>
          <label htmlFor="password">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </FormGroup>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          style={{ marginTop: '1.5rem', width: '100%' }}
        >
          {isSubmitting 
            ? 'Processing...' 
            : mode === 'login' ? 'Login' : 'Create Account'}
        </Button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <ToggleButton onClick={toggleForm}>
          {mode === 'login' 
            ? "Don't have an account? Sign up" 
            : "Already have an account? Login"}
        </ToggleButton>
      </div>
    </AuthContainer>
  );
};

export default AuthForm; 