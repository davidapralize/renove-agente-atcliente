import { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { CarCarousel } from './components/CarCarousel';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, isTyping } = useSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, isTyping, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-widget-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="renove-chat-wrapper"
          >
            {/* Header */}
            <header className="chat-header">
              <div className="brand-meta">
                <div className="avatar-status">
                  <div className="avatar">R</div>
                  <span className="status-dot online"></span>
                </div>
                <div className="brand-text">
                  <span className="name">Renove AI</span>
                  <span className="status-label">A su servicio</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                <X size={20} />
              </button>
            </header>

            {/* Viewport */}
            <main className="chat-viewport">
              {messages.length === 0 && (
                <div className="welcome-message">
                   <h2>Bienvenido a Renove</h2>
                   <p>¿En qué vehículo estás interesado hoy?</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'row-user' : 'row-ai'}`}>
                  {msg.type === 'text' ? (
                    <div 
                      className={`message-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`}
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                    />
                  ) : msg.uiType === 'car_cards' ? (
                    <CarCarousel cars={msg.data.cars} />
                  ) : msg.uiType === 'booking_confirmation' ? (
                    <div className="booking-confirmation">
                      <h3>¡Cita Confirmada!</h3>
                      <p>Código: <strong>{msg.data.confirmation_code}</strong></p>
                      <p>Fecha: {msg.data.date} - {msg.data.time}</p>
                    </div>
                  ) : null}
                </div>
              ))}

              {isTyping && (
                 <div className="message-bubble ai-msg typing-indicator">
                    <span>.</span><span>.</span><span>.</span>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </main>

            {/* Input */}
            <footer className="chat-input-container">
              <input 
                type="text" 
                id="user-query" 
                placeholder="Escribe tu mensaje..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                autoComplete="off"
              />
              <button id="btn-send" onClick={handleSubmit}>
                <Send size={18} />
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="chat-toggle-btn"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
}