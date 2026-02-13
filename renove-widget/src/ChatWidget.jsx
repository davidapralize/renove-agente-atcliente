import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { CarCarousel } from './components/CarCarousel';
import { BookingConfirmation } from './components/BookingConfirmation';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, sendSilentMessage, isProcessing, statusLabel, onInputChange } = useSocket();
  const [input, setInput] = useState('');
  const chatViewportRef = useRef(null);
  const chatOpenedRef = useRef(false);
  const aiStreamingRef = useRef(null);
  const lastScrolledAiIndexRef = useRef(-1);
  const inputRef = useRef(null);
  const scrollPosRef = useRef(0);
  const isAutoScrollingRef = useRef(false);

  useEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport) return;
    const onScroll = () => { scrollPosRef.current = viewport.scrollTop; };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  useLayoutEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const lastIndex = messages.length - 1;

    if (lastMessage.role === 'user' || lastMessage.uiType === 'skeleton_loader') {
      if (lastMessage.role === 'user') lastScrolledAiIndexRef.current = -1;
      isAutoScrollingRef.current = true;
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        isAutoScrollingRef.current = false;
      });
      return;
    }

    if (lastMessage.role === 'ai' && lastMessage.isStreaming && lastScrolledAiIndexRef.current !== lastIndex) {
      lastScrolledAiIndexRef.current = lastIndex;
      isAutoScrollingRef.current = true;
      requestAnimationFrame(() => {
        if (aiStreamingRef.current) {
          viewport.scrollTo({ top: aiStreamingRef.current.offsetTop, behavior: 'smooth' });
        }
        isAutoScrollingRef.current = false;
      });
      return;
    }

    if (!isAutoScrollingRef.current) {
      viewport.scrollTop = scrollPosRef.current;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !chatOpenedRef.current) {
      chatOpenedRef.current = true;
      if (messages.length === 0 && !isProcessing) {
        setTimeout(() => {
          sendSilentMessage('Hola! Preséntate y cuéntame qué puedes hacer?');
        }, 300);
      }
    } else if (!isOpen) {
      chatOpenedRef.current = false;
    }
  }, [isOpen, messages.length, isProcessing, sendSilentMessage]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    inputRef.current?.blur();
  };

  return (
    <div className={`chat-widget-container ${isOpen ? 'chat-open' : ''}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="renove-chat-wrapper"
          >
            <header className="chat-header">
              <div className="brand-meta">
                <div className="avatar-status">
                  <div className="avatar">
                    <img src={new URL('../public/renove-logo.png', import.meta.url).href} alt="Renove" className="avatar-logo" />
                  </div>
                  <span className="status-dot online"></span>
                </div>
                <div className="brand-text">
                  <span className="name">Renove AI</span>
                  <span className="status-label" id="ai-status">{statusLabel || 'A su servicio'}</span>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
                <X size={20} />
              </button>
            </header>

            <main ref={chatViewportRef} className="chat-viewport" id="chat-display">
              {messages.length === 0 && (
                <div className="welcome-message">
                   <h2>Bienvenido a Renove Elite</h2>
                   <p>Tu asesor de élite. Explora nuestra colección exclusiva y encuentra el coche de tus sueños.</p>
                </div>
              )}
              
              {messages.map((msg, i) => {
                if (msg.type === 'text') {
                  return (
                    <div 
                      key={i}
                      ref={msg.isStreaming ? aiStreamingRef : null}
                      className={`message-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'} ${msg.isStreaming ? 'is-streaming' : ''}`}
                    >
                      <span className="text-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                    </div>
                  );
                }
                
                if (msg.uiType === 'car_cards') {
                  return (
                    <div key={i} className="ui-element-container">
                      <CarCarousel 
                        cars={msg.data.cars} 
                        priorityStats={msg.data.priority_stats}
                        onCarDetails={(name) => sendMessage(`Cuéntame más sobre el ${name}`)} 
                      />
                    </div>
                  );
                }
                
                if (msg.uiType === 'booking_confirmation') {
                  return (
                    <div key={i} className="ui-element-container">
                      <BookingConfirmation data={msg.data} />
                    </div>
                  );
                }
                
                if (msg.uiType === 'financing_table') {
                  const financing = msg.data;
                  const formatPrice = (price) => {
                    if (price === null || price === undefined) return 'N/D';
                    return new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0
                    }).format(price);
                  };
                  
                  if (!Array.isArray(financing) || financing.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={i} className="ui-element-container">
                      <div className="financing-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Plazo</th>
                              <th>Mensual</th>
                              <th>TAE</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financing.map((option, idx) => (
                              <tr key={idx}>
                                <td>{option.term || 'N/D'}</td>
                                <td>{formatPrice(option.monthly_payment)}</td>
                                <td>{option.apr || 'N/D'}</td>
                                <td>{formatPrice(option.total_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
                
                if (msg.uiType === 'skeleton_loader') {
                  return (
                    <div key={i} className="skeleton-loader" id="skeleton-loader"></div>
                  );
                }
                
                return null;
              })}

            </main>

            <footer className="chat-input-container">
              <input 
                ref={inputRef}
                type="text" 
                id="user-query" 
                placeholder="¿En qué puedo ayudarte?" 
                value={input}
                onChange={(e) => { setInput(e.target.value); onInputChange(); }}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                autoComplete="off"
              />
              <button id="btn-send" onClick={handleSubmit} disabled={!input.trim() || isProcessing}>
                <Send size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="chat-toggle-btn"
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
}
