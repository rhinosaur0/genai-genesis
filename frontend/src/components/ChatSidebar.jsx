import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(30, 27, 38, 0.7);
  border-left: 1px solid rgba(123, 104, 238, 0.3);
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 104, 238, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #f5f5f7;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Message = styled.div`
  padding: 0.8rem 1rem;
  border-radius: 12px;
  max-width: 90%;
  background: ${props => props.isUser ? 'rgba(123, 104, 238, 0.15)' : 'rgba(50, 50, 70, 0.5)'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  border-bottom-right-radius: ${props => props.isUser ? '4px' : '12px'};
  border-bottom-left-radius: ${props => props.isUser ? '12px' : '4px'};
`;

const MessageText = styled.p`
  font-size: 0.9rem;
  line-height: 1.4;
  color: #f5f5f7;
`;

const ChatInputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid rgba(123, 104, 238, 0.3);
`;

const ChatInputForm = styled.form`
  display: flex;
  gap: 0.5rem;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(123, 104, 238, 0.3);
  border-radius: 8px;
  background: rgba(30, 27, 38, 0.5);
  color: #f5f5f7;
  font-family: 'Montserrat', sans-serif;
  
  &:focus {
    outline: none;
    border-color: #7b68ee;
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #7b68ee;
  color: white;
  border: none;
  cursor: pointer;
  
  &:hover {
    background: #6a5acd;
  }
  
  &:disabled {
    background: gray;
    cursor: not-allowed;
  }
`;

function ChatSidebar({ modelPrompt }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Add initial AI greeting
  useEffect(() => {
    const aiGreeting = `Hello! I'm your 3D model assistant. I can help you understand and interact with this model. What would you like to know?`;
    
    setTimeout(() => {
      setMessages([{ 
        text: aiGreeting, 
        isUser: false 
      }]);
    }, 500);
  }, []);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || isTyping) return;
    
    // Add user message
    const userMessage = { text: inputValue, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate AI typing
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = `I understand you're asking about "${inputValue}". The model was created based on the prompt: "${modelPrompt || 'your specified criteria'}"`;
      
      setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <SidebarContainer>
      <ChatHeader>
        <h3>AI Assistant</h3>
      </ChatHeader>
      
      <ChatMessages>
        {messages.map((message, index) => (
          <Message key={index} isUser={message.isUser}>
            <MessageText>{message.text}</MessageText>
          </Message>
        ))}
        
        {isTyping && (
          <Message isUser={false}>
            <MessageText>Typing...</MessageText>
          </Message>
        )}
        
        <div ref={messagesEndRef} />
      </ChatMessages>
      
      <ChatInputContainer>
        <ChatInputForm onSubmit={handleSubmit}>
          <ChatInput
            type="text"
            placeholder="Ask about your 3D model..."
            value={inputValue}
            onChange={handleInputChange}
            disabled={isTyping}
          />
          <SendButton type="submit" disabled={inputValue.trim() === '' || isTyping}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </SendButton>
        </ChatInputForm>
      </ChatInputContainer>
    </SidebarContainer>
  );
}

export default ChatSidebar; 