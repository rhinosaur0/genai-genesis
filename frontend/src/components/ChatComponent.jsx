import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const GEMINI_API_KEY = "AIzaSyD_3CxbJNcn98no6K-VNRo_do-oT5oHzh0";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent";

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      content: input,
      role: 'user',
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Create the request to Gemini API
      const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: input }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        }),
      });
      
      const data = await response.json();
      
      // Extract the response text from Gemini
      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                         "Sorry, I couldn't process that request.";
      
      // Add AI message to chat
      setMessages(prev => [...prev, {
        content: aiResponse,
        role: 'assistant',
      }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, {
        content: "Sorry, there was an error processing your request.",
        role: 'assistant',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <h3>AI Assistant</h3>
      </ChatHeader>
      <MessagesContainer>
        {messages.map((msg, index) => (
          <MessageBubble key={index} role={msg.role}>
            <MessageContent>{msg.content}</MessageContent>
          </MessageBubble>
        ))}
        {isLoading && (
          <LoadingIndicator>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </LoadingIndicator>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <ChatInput
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <SendButton onClick={sendMessage} disabled={isLoading}>
          Send
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
}

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  border-left: 1px solid #333;
`;

const ChatHeader = styled.div`
  padding: 15px;
  background-color: #252526;
  border-bottom: 1px solid #333;
  
  h3 {
    margin: 0;
    color: #cccccc;
    font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 8px;
  align-self: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.role === 'user' ? '#0078D4' : '#2D2D2D'};
  color: ${props => props.role === 'user' ? 'white' : '#CCCCCC'};
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
`;

const MessageContent = styled.p`
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 15px;
  background-color: #252526;
  border-top: 1px solid #333;
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #3C3C3C;
  background-color: #1E1E1E;
  color: #CCCCCC;
  resize: none;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  min-height: 40px;
  max-height: 120px;
  
  &:focus {
    outline: none;
    border-color: #0078D4;
  }
`;

const SendButton = styled.button`
  margin-left: 10px;
  padding: 8px 15px;
  background-color: #0078D4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "SF Mono", "Roboto Mono", "Fira Code", monospace;
  
  &:hover {
    background-color: #106EBE;
  }
  
  &:disabled {
    background-color: #3C3C3C;
    cursor: not-allowed;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-self: flex-start;
  gap: 4px;
  padding: 8px;
  background-color: #2D2D2D;
  border-radius: 8px;
  
  .dot {
    width: 8px;
    height: 8px;
    background-color: #CCCCCC;
    border-radius: 50%;
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  .dot:nth-child(2) {
    animation-delay: 0.5s;
  }
  
  .dot:nth-child(3) {
    animation-delay: 1s;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
`;

export default ChatComponent; 