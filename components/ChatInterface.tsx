'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {}

const getRandomPitch = (): string => {
  try {
    const pitches = require('../config/pitch.json');
    const randomIndex = Math.floor(Math.random() * pitches.length);
    return pitches[randomIndex];
  } catch (error) {
    console.error('Failed to load pitch.json:', error);
    return 'Здравствуйте! Готов обсуждать альтернативные взгляды на историю. О чем поговорим?';
  }
};

export default function ChatInterface({}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getRandomPitch() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, currentResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setCurrentResponse(assistantMessage);
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
      setCurrentResponse('');
      
      // Focus input after response is complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      { role: 'assistant', content: getRandomPitch() }
    ]);
    setCurrentResponse('');
  };

  return (
    <div className="flex flex-col" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg, #f8f4ff 0%, #f0e6ff 100%)' }}>
      <div style={{ backgroundColor: '#6b46c1', borderBottom: '1px solid #8b5cf6' }} className="p-4">
        <div className="mx-auto" style={{ maxWidth: '800px' }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold" style={{ color: '#ffffff' }}>Я узнал о новой хронологии, и хочу вам рассказать...</h1>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#ec4899', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#db2777'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ec4899'}
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0, maxHeight: 'calc(100vh - 140px)' }}>
        <div className="mx-auto space-y-4" style={{ maxWidth: '800px' }}>
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl ${
                message.role === 'user' 
                  ? '' 
                  : ''
              }`} style={message.role === 'user' 
                ? { backgroundColor: '#a855f7', color: '#ffffff', borderRadius: '20px', paddingTop: '3px', paddingBottom: '3px', paddingLeft: '20px', paddingRight: '20px' }
                : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '20px', paddingTop: '3px', paddingBottom: '3px', paddingLeft: '20px', paddingRight: '20px' }
              }>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        code: ({ children, ...props }) => 
                          (props as any).inline ? (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                              <code>{children}</code>
                            </pre>
                          )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {currentResponse && (
            <div className="flex justify-start">
              <div className="max-w-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '20px', paddingTop: '3px', paddingBottom: '3px', paddingLeft: '20px', paddingRight: '20px' }}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      code: ({ children, ...props }) => 
                        (props as any).inline ? (
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
                        ) : (
                          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                            <code>{children}</code>
                          </pre>
                        )
                    }}
                  >
                    {currentResponse}
                  </ReactMarkdown>
                </div>
                <div className="mt-2 flex items-center" style={{ color: '#a855f7' }}>
                  <div className="animate-pulse">●</div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', paddingTop: '24px', paddingBottom: '24px', paddingLeft: '48px', paddingRight: '48px' }}>
        <div className="mx-auto" style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              style={{ 
                flex: 1,
                minWidth: '80ch',
                paddingLeft: '16px',
                paddingRight: '16px', 
                paddingTop: '16px',
                paddingBottom: '16px',
                borderRadius: '9999px',
                outline: 'none',
                border: '1px solid #d1d5db', 
                backgroundColor: '#f9fafb'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#a855f7'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{ 
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                backgroundColor: '#a855f7', 
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9333ea')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#a855f7')}
            >
              {isLoading ? '...' : '➤'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
