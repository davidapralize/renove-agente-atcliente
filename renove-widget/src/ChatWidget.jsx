import { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { CarCarousel } from './components/CarCarousel';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, isProcessing, statusLabel, onInputChange } = useSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, isOpen]);

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
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="renove-chat-wrapper"
          >
            <header className="chat-header">
              <div className="brand-meta">
                <div className="avatar-status">
                  <div className="avatar">R</div>
                  <span className="status-dot online"></span>
                </div>
                <div className="brand-text">
                  <span className="name">Renove AI</span>
                  <span className="status-label" id="ai-status">{statusLabel || 'A su servicio'}</span>
                </div>
              </div>
              <div className="header-actions">
                 <div className="quality-badge">Premium Elite</div>
                 <button onClick={() => setIsOpen(false)} className="close-btn" aria-label="Cerrar chat">
                    <X size={18} />
                 </button>
              </div>
            </header>

            <main className="chat-viewport" id="chat-display">
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
                      className={`message-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'} ${msg.isStreaming ? 'is-streaming' : ''}`}
                    >
                      {msg.isStreaming ? (
                        <span className="text-content">{msg.content}</span>
                      ) : (
                        <span className="text-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                      )}
                    </div>
                  );
                }
                
                if (msg.uiType === 'car_cards') {
                  return (
                    <div key={i} className="ui-element-container">
                      <CarCarousel cars={msg.data.cars} onCarDetails={(name) => sendMessage(`Cuéntame más sobre el ${name}`)} />
                    </div>
                  );
                }
                
                if (msg.uiType === 'car_viewer') {
                  const carData = msg.data;
                  const carName = `${carData.brand || ''} ${carData.model || ''}`.trim();
                  const specs = carData.specs || {};
                  
                  const specLabels = {
                    hp: 'Potencia',
                    '0_100_kmh': '0-100 km/h',
                    top_speed: 'Velocidad máxima',
                    doors: 'Puertas',
                    trunk_space: 'Maletero',
                    safety_rating: 'Seguridad',
                    fuel_consumption: 'Consumo',
                    co2_emissions: 'CO2',
                    environmental_label: 'Etiqueta ECO',
                    price: 'Precio',
                    year: 'Año',
                    mileage: 'Kilometraje',
                    trim_level: 'Acabado',
                    equipment: 'Equipamiento',
                    interior_quality: 'Interior',
                    maintenance_cost: 'Mantenimiento',
                    range: 'Autonomía'
                  };
                  
                  const priorities = {
                    family: ['doors', 'trunk_space', 'safety_rating'],
                    efficiency: ['fuel_consumption', 'co2_emissions', 'environmental_label'],
                    performance: ['hp', '0_100_kmh', 'top_speed'],
                    luxury: ['trim_level', 'equipment', 'interior_quality'],
                    economy: ['price', 'fuel_consumption', 'maintenance_cost'],
                    default: ['price', 'year', 'mileage']
                  };
                  
                  const context = carData.context || 'default';
                  const keysToShow = priorities[context] || priorities.default;
                  
                  return (
                    <div key={i} className="ui-element-container">
                      <div className="luxury-car-viewer">
                        <div className="luxury-car-image-wrapper">
                          <img 
                            src={carData.image || 'https://via.placeholder.com/600x400?text=No+Image'} 
                            alt={carName} 
                            className="luxury-car-image"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=No+Image'; }}
                          />
                          <div className="image-overlay">
                            <button className="hover-view-more" onClick={() => sendMessage(`Cuéntame todo sobre el ${carName}`)}>
                              Ver más
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="luxury-car-content">
                          <h3 className="luxury-car-title">{carName}</h3>
                          <div className="luxury-specs-row">
                            {keysToShow.slice(0, 4).map(key => {
                              if (specs[key]) {
                                const label = specLabels[key] || key.replace(/_/g, ' ');
                                return (
                                  <div key={key} className="luxury-spec-chip">
                                    <div className="spec-content">
                                      <span className="spec-chip-label">{label}</span>
                                      <span className="spec-chip-value">{specs[key]}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (msg.uiType === 'booking_confirmation') {
                  return (
                    <div key={i} className="ui-element-container">
                      <div className="booking-confirmation">
                        <h3>Prueba de conducción confirmada</h3>
                        <p><strong>Vehículo:</strong> {msg.data.model || 'N/D'}</p>
                        <p><strong>Fecha:</strong> {msg.data.date || 'N/D'}</p>
                        <p><strong>Hora:</strong> {msg.data.time || 'N/D'}</p>
                        <p><strong>Confirmación:</strong> {msg.data.confirmation_code || 'N/D'}</p>
                      </div>
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

              <div ref={messagesEndRef} />
            </main>

            <footer className="chat-input-container">
              <input 
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
