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
    <div className="fixed bottom-6 right-6 z-[99999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="renove-chat-wrapper !h-[650px] !w-[400px] !max-w-[90vw] !m-0 flex flex-col shadow-2xl"
            style={{ position: 'relative', transform: 'none', animation: 'none' }}
          >
            {/* Header */}
            <header className="chat-header shrink-0">
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
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </header>

            {/* Viewport */}
            <main className="chat-viewport flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="welcome-message">
                   <h2>Bienvenido a Renove</h2>
                   <p>¿En qué vehículo estás interesado hoy?</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.type === 'text' ? (
                    <div 
                      className={`message-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'} !max-w-[90%]`}
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                    />
                  ) : msg.uiType === 'car_cards' ? (
                    <CarCarousel cars={msg.data.cars} />
                  ) : msg.uiType === 'booking_confirmation' ? (
                    <div className="booking-confirmation w-full">
                      <h3>¡Cita Confirmada!</h3>
                      <p>Código: <strong>{msg.data.confirmation_code}</strong></p>
                      <p>Fecha: {msg.data.date} - {msg.data.time}</p>
                    </div>
                  ) : null}
                </div>
              ))}

              {isTyping && (
                 <div className="message-bubble ai-msg w-16 flex items-center justify-center gap-1 py-4">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </main>

            {/* Input */}
            <footer className="chat-input-container shrink-0">
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
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#a80000] to-[#7a0000] text-white shadow-xl flex items-center justify-center border border-[#ff1a1a] absolute bottom-0 right-0 z-50"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
}