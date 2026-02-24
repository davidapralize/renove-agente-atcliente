import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { getRandomGreeting } from './greetings';
import { getRandomBubbleMessage, detectPageType } from './bubbleMessages';
import { CarCarousel } from './components/CarCarousel';
import { BookingConfirmation } from './components/BookingConfirmation';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

const BUBBLE_INITIAL_DELAY = 10000; // 10s para la primera burbuja
const BUBBLE_FOLLOWUP_DELAY = 45000; // 45s para la segunda burbuja
const BUBBLE_SESSION_KEY = 'renove_bubble_dismissed';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, showLocalGreeting, isProcessing, statusLabel, onInputChange, detectedCar } = useSocket();
  const [input, setInput] = useState('');
  const [bubbleMessage, setBubbleMessage] = useState(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const chatViewportRef = useRef(null);
  const chatOpenedRef = useRef(false);
  const aiStreamingRef = useRef(null);
  const lastScrolledAiIndexRef = useRef(-1);
  const inputRef = useRef(null);
  const scrollPosRef = useRef(0);
  const bubbleTimerRef = useRef(null);
  const followupTimerRef = useRef(null);
  const bubblePhaseRef = useRef('initial'); // 'initial' | 'followup' | 'done'

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
      const scrollTarget = viewport.scrollHeight;
      scrollPosRef.current = scrollTarget;
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: scrollTarget, behavior: 'smooth' });
      });
      return;
    }

    if (lastMessage.role === 'ai' && lastMessage.isStreaming && lastScrolledAiIndexRef.current !== lastIndex) {
      lastScrolledAiIndexRef.current = lastIndex;
      if (aiStreamingRef.current) {
        viewport.scrollTop = aiStreamingRef.current.offsetTop;
        scrollPosRef.current = viewport.scrollTop;
      }
      return;
    }

    const savedPos = scrollPosRef.current;
    viewport.scrollTop = savedPos;
    requestAnimationFrame(() => {
      if (viewport.scrollTop !== savedPos) {
        viewport.scrollTop = savedPos;
      }
    });
  }, [messages, statusLabel]);

  // --- Proactive bubble logic ---
  const getCurrentPageUrl = useCallback(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pageUrlParam = urlParams.get('page_url');
      if (pageUrlParam) return decodeURIComponent(pageUrlParam);
      if (window.parent && window.parent !== window) return window.parent.location.href;
    } catch (e) { /* cross-origin */ }
    return window.location.href;
  }, []);

  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    setBubbleMessage(null);
    clearTimeout(bubbleTimerRef.current);
    clearTimeout(followupTimerRef.current);
    bubblePhaseRef.current = 'done';
    try { sessionStorage.setItem(BUBBLE_SESSION_KEY, '1'); } catch (e) {}
  }, []);

  const showBubble = useCallback((msg) => {
    setBubbleMessage(msg);
    setBubbleVisible(true);
  }, []);

  // Start bubble timers on mount (only if not dismissed this session)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(BUBBLE_SESSION_KEY)) return;
    } catch (e) {}

    const pageType = detectPageType(getCurrentPageUrl());

    bubbleTimerRef.current = setTimeout(() => {
      if (bubblePhaseRef.current !== 'initial') return;
      showBubble(getRandomBubbleMessage(pageType, 'initial'));

      // Schedule followup
      followupTimerRef.current = setTimeout(() => {
        if (bubblePhaseRef.current !== 'initial') return;
        bubblePhaseRef.current = 'followup';
        showBubble(getRandomBubbleMessage(pageType, 'followup'));
      }, BUBBLE_FOLLOWUP_DELAY);
    }, BUBBLE_INITIAL_DELAY);

    return () => {
      clearTimeout(bubbleTimerRef.current);
      clearTimeout(followupTimerRef.current);
    };
  }, [getCurrentPageUrl, showBubble]);

  // Update bubble when car_detected fires (user navigated to a car page)
  useEffect(() => {
    if (!detectedCar) return;
    if (isOpen || bubblePhaseRef.current === 'done') return;

    // Switch bubble to car-specific message
    showBubble(getRandomBubbleMessage('car', 'initial'));

    // Reset followup timer for the new context
    clearTimeout(followupTimerRef.current);
    bubblePhaseRef.current = 'initial';
    followupTimerRef.current = setTimeout(() => {
      if (bubblePhaseRef.current !== 'initial') return;
      bubblePhaseRef.current = 'followup';
      showBubble(getRandomBubbleMessage('car', 'followup'));
    }, BUBBLE_FOLLOWUP_DELAY);
  }, [detectedCar, isOpen, showBubble]);

  // Hide bubble when chat opens; dismiss permanently
  useEffect(() => {
    if (isOpen && bubblePhaseRef.current !== 'done') {
      dismissBubble();
    }
  }, [isOpen, dismissBubble]);

  const handleBubbleClick = () => {
    dismissBubble();
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen && !chatOpenedRef.current) {
      chatOpenedRef.current = true;
      if (messages.length === 0 && !isProcessing) {
        setTimeout(() => {
          showLocalGreeting(getRandomGreeting('general'));
        }, 300);
      }
    } else if (!isOpen) {
      chatOpenedRef.current = false;
    }
  }, [isOpen, messages.length, isProcessing, showLocalGreeting]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) inputRef.current?.blur();
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
                      <div className="text-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
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

      <AnimatePresence>
        {bubbleVisible && !isOpen && bubbleMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            className="proactive-bubble"
            onClick={handleBubbleClick}
          >
            <div className="proactive-bubble-header">
              <span className="proactive-bubble-dot"></span>
              <span className="proactive-bubble-name">Renove AI</span>
            </div>
            <span className="proactive-bubble-text">{bubbleMessage}</span>
            <button
              className="proactive-bubble-close"
              onClick={(e) => { e.stopPropagation(); dismissBubble(); }}
              aria-label="Cerrar"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`chat-toggle-btn ${bubbleVisible && !isOpen ? 'has-bubble' : ''}`}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
}
