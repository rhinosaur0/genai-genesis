import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  border-left: 1px solid var(--color-card-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--color-card-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-card-border);
    border-radius: 3px;
  }
`;

const Message = styled.div`
  padding: 0.8rem 1rem;
  border-radius: 12px;
  max-width: 90%;
  
  ${props => props.isUser ? `
    background: var(--color-translucent);
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  ` : `
    background: rgba(50, 50, 70, 0.5);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  `}
`;

const MessageText = styled.p`
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-text);
`;

const ChatInputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid var(--color-card-border);
`;

const ChatInputForm = styled.form`
  display: flex;
  gap: 0.5rem;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  background: rgba(30, 27, 38, 0.5);
  color: var(--color-text);
  font-family: 'Montserrat', sans-serif;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-secondary);
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

  // Add initial AI greeting when the component mounts
  useEffect(() => {
    // Initial greeting from the AI
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
    
    // Simulate AI response after a delay
    setTimeout(() => {
      // Example AI responses - in a real app this would come from your backend
      const aiResponses = [
        `I see you're interested in this model. What specific details would you like to explore?`,
        `That's an interesting question about the model. The texture details are particularly notable in this area.`,
        `You can rotate the model by clicking and dragging. Try exploring it from different angles!`,
        `This model was created based on your prompt: "${modelPrompt}". Is there anything specific about it you'd like to discuss?`,
        `The lighting in this scene really brings out the details of the model's surface texture.`
      ];
      
      // Randomly select a response
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      // Add AI response
      setMessages(prev => [...prev, { text: randomResponse, isUser: false }]);
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