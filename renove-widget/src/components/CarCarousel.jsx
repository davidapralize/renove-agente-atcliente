import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar, Fuel, Gauge } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';

const FUEL_LABELS = {
  DIESEL: 'Diesel',
  GASOLINE: 'Gasolina',
  ELECTRIC: 'Eléctrico',
  HYBRID: 'Híbrido',
  PLUG_IN_HYBRID: 'Híbrido Enchf.',
  LIQUID_GAS: 'Gas Licuado',
  HYDROGEN: 'Hidrógeno',
  NATURAL_GAS: 'Gas Natural',
  GLP: 'GLP',
};

const formatFuel = (raw) => {
  if (!raw) return 'N/D';
  return FUEL_LABELS[raw.toUpperCase()] || raw;
};

export const CarCarousel = ({ cars, onCarDetails }) => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !cars?.length) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setActiveIndex(0); return; }
    const ratio = el.scrollLeft / maxScroll;
    const idx = Math.round(ratio * (cars.length - 1));
    setActiveIndex(Math.min(Math.max(idx, 0), cars.length - 1));
  }, [cars]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActiveIndex, { passive: true });
    return () => el.removeEventListener('scroll', updateActiveIndex);
  }, [updateActiveIndex]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  const scrollToIndex = (index) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.offsetWidth || 280;
    const gap = 16;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
  };

  const handleViewMore = (e, car) => {
    e.stopPropagation();
    const name = `${car.make || ''} ${car.model || ''}`.trim();
    if (onCarDetails) onCarDetails(name);
  };

  if (!cars?.length) return null;

  return (
    <div className="car-carousel">

      <button onClick={() => scroll(-1)} className="carousel-nav carousel-prev">
        <ChevronLeft size={20} />
      </button>

      <div ref={scrollRef} className="car-scroll-track">
        {cars.map((car) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={car.vehicleId}
            className="car-card-v2"
            onClick={() => window.open(car.link, '_blank')}
          >
            <div className="car-card-v2-image-wrap">
              <img
                src={car.image || 'https://via.placeholder.com/400x300'}
                alt={car.model}
                className="car-card-v2-img"
              />
              <div className="car-card-v2-gradient"></div>

              <div className="car-card-v2-header">
                <div className="car-card-v2-title-group">
                  <span className="car-card-v2-brand">{car.make}</span>
                  <h3 className="car-card-v2-model">{car.model}</h3>
                </div>
                <div className="car-card-v2-price">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(car.price)}
                </div>
              </div>

              <button className="car-card-v2-view-more" onClick={(e) => handleViewMore(e, car)}>
                Ver mas
              </button>

              <div className="car-card-v2-stats">
                <div className="car-card-v2-stat">
                  <Calendar size={18} />
                  <span>{car.year}</span>
                </div>
                <div className="car-card-v2-stat">
                  <Gauge size={18} />
                  <span>{car.mileage || 'N/D'}</span>
                </div>
                <div className="car-card-v2-stat">
                  <Fuel size={18} />
                  <span>{formatFuel(car.specs?.fuel)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button onClick={() => scroll(1)} className="carousel-nav carousel-next">
        <ChevronRight size={20} />
      </button>

      <div className="carousel-indicators">
        {cars.map((_, i) => (
          <button
            key={i}
            className={`carousel-indicator ${i === activeIndex ? 'active' : ''}`}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};
