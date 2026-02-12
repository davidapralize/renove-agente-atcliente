import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useRef } from 'react';

export const CarCarousel = ({ cars }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  if (!cars?.length) return null;

  return (
    <div className="ui-element-container">
      <div className="car-carousel relative group">
        <button onClick={() => scroll(-1)} className="carousel-nav carousel-prev opacity-0 group-hover:opacity-100 absolute left-0 z-10 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white">
          <ChevronLeft size={20} />
        </button>
        
        <div ref={scrollRef} className="flex overflow-x-auto gap-4 py-4 px-1 snap-x no-scrollbar scroll-smooth">
          {cars.map((car) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={car.vehicleId} 
              className="car-card min-w-[280px] snap-center active block !transform-none !opacity-100 !animation-none" // Forzamos visibilidad anulando animaciones CSS complejas para simplificar React
              style={{ display: 'block', animation: 'none' }}
            >
              <div className="car-card-image-container h-48 relative">
                <img src={car.image || 'https://via.placeholder.com/400x300'} alt={car.model} className="car-card-image w-full h-full object-cover rounded-t-xl" />
                <div className="car-card-overlay flex items-center justify-center">
                  <span className="car-card-view-more">Ver más</span>
                </div>
              </div>
              <div className="car-card-info p-4">
                <div className="car-card-title text-white">{car.make} {car.model}</div>
                <div className="car-card-stats grid grid-cols-3 gap-2">
                  <div className="car-card-stat"><span className="stat-label">Precio</span><span className="stat-value">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(car.price)}</span></div>
                  <div className="car-card-stat"><span className="stat-label">Año</span><span className="stat-value">{car.year}</span></div>
                  <div className="car-card-stat"><span className="stat-label">KM</span><span className="stat-value">{car.mileage}</span></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button onClick={() => scroll(1)} className="carousel-nav carousel-next opacity-0 group-hover:opacity-100 absolute right-0 z-10 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};