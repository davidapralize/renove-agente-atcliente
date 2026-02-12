import { motion } from 'framer-motion';
import { Check, Calendar, Clock, Car } from 'lucide-react';

export function BookingConfirmation({ data }) {
  const { model, date, time, confirmation_code, image } = data;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="booking-confirmation-modern"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      <div className="booking-content">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="booking-success-icon"
        >
          <Check size={28} strokeWidth={3} />
        </motion.div>
        
        <h3 className="booking-title">Prueba confirmada</h3>
        
        <div className="booking-info-row">
          <div className="booking-info-item">
            <Car size={16} />
            <span>{model || 'N/D'}</span>
          </div>
          
          <div className="booking-info-item">
            <Calendar size={16} />
            <span>{date || 'N/D'}</span>
          </div>
          
          <div className="booking-info-item">
            <Clock size={16} />
            <span>{time || 'N/D'}</span>
          </div>
        </div>
        
        <div className="booking-code-display">
          {confirmation_code || 'N/D'}
        </div>
      </div>
    </motion.div>
  );
}
