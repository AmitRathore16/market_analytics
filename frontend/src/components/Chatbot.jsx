import React, { useState, useRef, useEffect } from 'react';
import { Send, Moon, Sun, PlusCircle, Database, RefreshCw } from 'lucide-react';
import axios from 'axios';

const Chatbot = ({ theme, toggleTheme }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I am your AI assistant. I can answer questions about your stock market data.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setMessages([
      { role: 'ai', content: 'Hello! I am your AI assistant. Let\'s start a new conversation about your data.' }
    ]);
  };

  const handleRefreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      setMessages(prev => [...prev, { role: 'ai', content: '⏳ Refreshing data from market... this may take a minute.' }]);
      const res = await axios.post('http://localhost:5001/api/refresh-data');
      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'ai', content: '✅ Data pipeline completed successfully. The database is now up to date!' }]);
      }
    } catch (error) {
      console.error("Refresh error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: '❌ Failed to refresh data pipeline. Please check backend logs.' }]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/api/chat', {
        message: userMessage,
        history: messages
      });

      const aiData = response.data;
      
      setMessages(prev => [
        ...prev, 
        { 
          role: 'ai', 
          content: aiData.content,
          query: aiData.query,
          showQuery: false
        }
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev, 
        { role: 'ai', content: "Sorry, I encountered an error while processing your request." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuery = (index) => {
    setMessages(prev => prev.map((msg, i) => {
      if (i === index) {
        return { ...msg, showQuery: !msg.showQuery };
      }
      return msg;
    }));
  };

  return (
    <div className="chat-section">
      <div className="chat-header">
        <h2>Data Assistant</h2>
        <div className="header-actions">
          <button onClick={handleRefreshData} className="icon-button" title="Refresh Data" disabled={isRefreshing}>
            <RefreshCw size={20} className={isRefreshing ? 'spinning' : ''} />
          </button>
          <button onClick={handleNewChat} className="icon-button" title="New Chat">
            <PlusCircle size={20} />
          </button>
          <button onClick={toggleTheme} className="icon-button" title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
            {msg.query && (
              <div>
                <button 
                  className="sql-query-btn" 
                  onClick={() => toggleQuery(index)}
                >
                  <Database size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {msg.showQuery ? 'Hide Query' : 'Show Query'}
                </button>
                {msg.showQuery && (
                  <div className="sql-query-display">
                    {msg.query}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your stock data..."
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
