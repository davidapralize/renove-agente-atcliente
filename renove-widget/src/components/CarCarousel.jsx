import { useState, useEffect, useRef } from 'react';

export const CarCarousel = ({ cars, onCarDetails }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const carouselId = useRef(`carousel-${Date.now()}`);

  if (!cars?.length) return null;

  const navigateCarousel = (direction) => {
    const container = containerRef.current;
    if (!container) return;

    const newIndex = (currentIndex + direction + cars.length) % cars.length;
    
    const containerEl = container.querySelector('.car-carousel-container');
    if (containerEl) {
      containerEl.classList.add('animating');
      setTimeout(() => {
        containerEl.classList.remove('animating');
      }, 900);
    }

    setCurrentIndex(newIndex);
  };

  const goToSlide = (targetIndex) => {
    if (currentIndex === targetIndex) return;
    
    const direction = targetIndex > currentIndex ? 1 : -1;
    const container = containerRef.current;
    if (!container) return;

    const containerEl = container.querySelector('.car-carousel-container');
    if (containerEl) {
      containerEl.classList.add('animating');
      setTimeout(() => {
        containerEl.classList.remove('animating');
      }, 900);
    }

    setCurrentIndex(targetIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateCarousel(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateCarousel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const containerEl = container.querySelector('.car-carousel-container');
    if (!containerEl) return;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          navigateCarousel(1);
        } else {
          navigateCarousel(-1);
        }
      }
    };

    containerEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    containerEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      containerEl.removeEventListener('touchstart', handleTouchStart);
      containerEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentIndex]);

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/D';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="car-carousel" id={carouselId.current} ref={containerRef}>
      <div className="car-carousel-container">
        {cars.map((car, index) => {
          const carName = `${car.brand || car.make || ''} ${car.model || ''}`.trim();
          const isActive = index === currentIndex;
          const direction = index > currentIndex ? 'right' : 'left';
          
          return (
            <div 
              key={index} 
              className={`car-card ${isActive ? 'active slide-in-' + direction : ''}`}
              data-index={index}
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <div className="car-card-image-container" onClick={() => onCarDetails?.(carName)}>
                <img 
                  src={car.image || 'https://via.placeholder.com/400x300?text=No+Image'} 
                  alt={carName} 
                  className="car-card-image"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                />
                <div className="car-card-overlay">
                  <span className="car-card-view-more">Ver más</span>
                </div>
              </div>
              <div className="car-card-info">
                <div className="car-card-title">{carName || 'Modelo desconocido'}</div>
                <div className="car-card-stats">
                  <div className="car-card-stat">
                    <span className="stat-label">Precio</span>
                    <span className="stat-value">{formatPrice(car.price)}</span>
                  </div>
                  <div className="car-card-stat">
                    <span className="stat-label">{car.year ? 'Año' : 'Tipo'}</span>
                    <span className="stat-value">{car.year || car.type || 'N/D'}</span>
                  </div>
                  <div className="car-card-stat">
                    <span className="stat-label">{car.fuel ? 'Combustible' : 'Km'}</span>
                    <span className="stat-value">{car.fuel || car.mileage || 'N/D'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {cars.length > 1 && (
        <>
          <button className="carousel-nav carousel-prev" onClick={() => navigateCarousel(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className="carousel-nav carousel-next" onClick={() => navigateCarousel(1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <div className="carousel-dots">
            {cars.map((_, i) => (
              <span 
                key={i}
                className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(i)}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
