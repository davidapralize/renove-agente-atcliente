const socket = io();
const chatDisplay = document.getElementById('chat-display');
const statusLabel = document.getElementById('ai-status');
const userQueryInput = document.getElementById('user-query');
const btnSend = document.getElementById('btn-send');

let activeAiBubble = null;
let sessionId = null;
let isProcessing = false;
let isTextStreaming = false;
let pendingUIElements = [];
let messageQueue = [];
let messageBatchTimer = null;
const MESSAGE_BATCH_DELAY = 2000;

function getCurrentPageUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageUrlParam = urlParams.get('page_url');
    
    if (pageUrlParam) {
        console.log('[URL Detection] URL from query parameter:', pageUrlParam);
        return decodeURIComponent(pageUrlParam);
    }
    
    try {
        if (window.parent && window.parent !== window) {
            const parentUrl = window.parent.location.href;
            console.log('[URL Detection] URL from parent window:', parentUrl);
            return parentUrl;
        }
    } catch (e) {
        console.log('[URL Detection] Cannot access parent URL (cross-origin)');
    }
    
    const fallbackUrl = window.location.href;
    console.log('[URL Detection] Using fallback URL:', fallbackUrl);
    return fallbackUrl;
}

let currentPageUrl = getCurrentPageUrl();
console.log('[URL Detection] Final URL:', currentPageUrl);

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'page_url') {
        currentPageUrl = event.data.url;
        console.log('[URL Detection] URL updated from postMessage:', currentPageUrl);
        
        if (sessionId) {
            socket.emit('set_page_context', {
                session_id: sessionId,
                page_url: currentPageUrl
            });
        }
    }
});

window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }
    }, 800);
});

socket.on('connected', (data) => {
    sessionId = data.session_id;
    console.log('Connected:', data.message);
    
    socket.emit('set_page_context', {
        session_id: sessionId,
        page_url: currentPageUrl
    });
});

socket.on('car_detected', (data) => {
    console.log('[CAR DETECTED]', data);
    
    if (isProcessing) {
        console.log('[CAR DETECTED] Already processing, skipping auto-greeting');
        return;
    }
    
    isProcessing = true;
    btnSend.disabled = true;
    
    removeWelcomeMessage();
    
    socket.emit('message', {
        message: 'Hola',
        session_id: sessionId
    });
});

socket.on('chat_token', (data) => {
    if (data.type === 'text_start') {
        handleStreamStart();
    } else if (data.type === 'text_delta') {
        handleStreamDelta(data.token);
    } else if (data.type === 'text_complete') {
        handleStreamComplete();
    }
});

socket.on('ui_element', (data) => {
    if (isTextStreaming) {
        pendingUIElements.push(data);
    } else {
        renderUIElement(data);
    }
});

socket.on('status', (data) => {
    if (!isProcessing) return;
    
    updateStatus(data);
    if (data.show_skeleton) {
        showSkeletonLoader();
    }
});

socket.on('error', (data) => {
    displayError(data.message);
    resetUI();
});

socket.on('message_complete', () => {
    resetUI();
    
    if (messageQueue.length > 0) {
        startBatchTimer();
    }
});

function handleStreamStart() {
    if (!isProcessing) return;
    
    statusLabel.innerText = "Escribiendo...";
    removeWelcomeMessage();
    activeAiBubble = createMessageBubble('ai-msg');
    activeAiBubble.classList.add('is-streaming');
    isTextStreaming = true;
}

function handleStreamDelta(token) {
    if (activeAiBubble) {
        const textSpan = activeAiBubble.querySelector('.text-content');
        textSpan.innerText += token;
        scrollToBottom();
    }
}

function handleStreamComplete() {
    if (activeAiBubble) {
        activeAiBubble.classList.remove('is-streaming');
        const textSpan = activeAiBubble.querySelector('.text-content');
        const rawText = textSpan.innerText;
        textSpan.innerHTML = marked.parse(rawText);
    }
    statusLabel.innerText = "A su servicio";
    activeAiBubble = null;
    isTextStreaming = false;
    
    if (pendingUIElements.length > 0) {
        pendingUIElements.forEach((element, index) => {
            setTimeout(() => {
                renderUIElement(element);
            }, index * 150);
        });
        pendingUIElements = [];
    }
}

function createMessageBubble(type) {
    const div = document.createElement('div');
    div.className = `message-bubble ${type}`;
    div.innerHTML = `<span class="text-content"></span>`;
    chatDisplay.appendChild(div);
    return div;
}

function renderUIElement(data) {
    console.log('[UI_ELEMENT] Received:', data);
    removeSkeletonLoader();
    const container = document.createElement('div');
    container.className = 'ui-element-container';
    
    switch(data.type) {
        case 'car_viewer':
            container.innerHTML = renderCarViewer(data.data);
            chatDisplay.appendChild(container);
            setTimeout(() => {
                const viewerContainer = container.querySelector('.car-viewer-container');
                if (viewerContainer) {
                    viewerContainer.classList.add('active');
                }
            }, 100);
            break;
        case 'car_cards':
            container.innerHTML = renderCarCards(data.data.cars || []);
            chatDisplay.appendChild(container);
            const carousel = container.querySelector('.car-carousel');
            if (carousel) {
                setActiveCarousel(carousel.id);
            }
            break;
        case 'booking_confirmation':
            container.innerHTML = renderBookingConfirmation(data.data);
            chatDisplay.appendChild(container);
            break;
        case 'financing_table':
            container.innerHTML = renderFinancingTable(data.data);
            chatDisplay.appendChild(container);
            break;
        default:
            console.log('[UI_ELEMENT] Unhandled type:', data.type, data);
            return;
    }
    
    scrollToBottom();
}

function renderCarViewer(carData) {
    const priorities = {
        family: ['doors', 'trunk_space', 'safety_rating'],
        efficiency: ['fuel_consumption', 'co2_emissions', 'environmental_label'],
        performance: ['hp', '0_100_kmh', 'top_speed'],
        luxury: ['trim_level', 'equipment', 'interior_quality'],
        economy: ['price', 'fuel_consumption', 'maintenance_cost'],
        default: ['price', 'year', 'mileage']
    };

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

    const context = carData.context || 'default';
    const keysToShow = priorities[context] || priorities.default;
    const specs = carData.specs || {};
    const carName = `${carData.brand || ''} ${carData.model || ''}`.trim();

    let specsHTML = '';
    let count = 0;
    keysToShow.forEach(key => {
        if (specs[key] && count < 4) {
            const label = specLabels[key] || key.replace(/_/g, ' ');
            specsHTML += `
                <div class="luxury-spec-chip">
                    <div class="spec-content">
                        <span class="spec-chip-label">${label}</span>
                        <span class="spec-chip-value">${specs[key]}</span>
                    </div>
                </div>
            `;
            count++;
        }
    });

    return `
        <div class="luxury-car-viewer" id="car-viewer-${Date.now()}">
            <div class="luxury-car-image-wrapper">
                <img src="${carData.image || 'https://via.placeholder.com/600x400?text=No+Image'}" 
                     alt="${carName}" 
                     class="luxury-car-image"
                     onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'">
                <div class="image-overlay">
                    <button class="hover-view-more" onclick="showFullDetails('${carName}')">
                        Ver más
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="luxury-car-content">
                <h3 class="luxury-car-title">${carName}</h3>
                <div class="luxury-specs-row">
                    ${specsHTML}
                </div>
            </div>
        </div>
    `;
}

function showFullDetails(carName) {
    if (isProcessing) return;
    
    const userBubble = createMessageBubble('user-msg');
    const textSpan = userBubble.querySelector('.text-content');
    textSpan.innerText = `Muéstrame los detalles completos de ${carName}`;
    
    scrollToBottom();
    
    isProcessing = true;
    btnSend.disabled = true;
    
    socket.emit('message', {
        message: `Cuéntame todo sobre el ${carName}`,
        session_id: sessionId
    });
}

function renderCarCards(cars) {
    if (!Array.isArray(cars) || cars.length === 0) {
        return '';
    }
    
    const carouselId = `carousel-${Date.now()}`;
    const cardsHTML = cars.map((car, index) => {
        const carName = `${car.brand || ''} ${car.model || ''}`.trim();
        return `
        <div class="car-card ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="car-card-image-container" onclick="showCarDetails('${carName}')">
                <img src="${car.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                     alt="${carName}" 
                     class="car-card-image"
                     onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                <div class="car-card-overlay">
                    <span class="car-card-view-more">Ver más</span>
                </div>
            </div>
            <div class="car-card-info">
                <div class="car-card-title">${carName || 'Modelo desconocido'}</div>
                <div class="car-card-stats">
                    <div class="car-card-stat">
                        <span class="stat-label">Precio</span>
                        <span class="stat-value">${formatPrice(car.price)}</span>
                    </div>
                    <div class="car-card-stat">
                        <span class="stat-label">${car.year ? 'Año' : 'Tipo'}</span>
                        <span class="stat-value">${car.year || car.type || 'N/D'}</span>
                    </div>
                    <div class="car-card-stat">
                        <span class="stat-label">${car.fuel ? 'Combustible' : 'Km'}</span>
                        <span class="stat-value">${car.fuel || car.mileage || 'N/D'}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    return `
        <div class="car-carousel" id="${carouselId}">
            <div class="car-carousel-container">
                ${cardsHTML}
            </div>
            ${cars.length > 1 ? `
                <button class="carousel-nav carousel-prev" onclick="navigateCarousel('${carouselId}', -1)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button class="carousel-nav carousel-next" onclick="navigateCarousel('${carouselId}', 1)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            ` : ''}
            ${cars.length > 1 ? `
                <div class="carousel-dots">
                    ${cars.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToCarouselSlide('${carouselId}', ${i})"></span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function showCarDetails(carName) {
    if (isProcessing) return;
    
    const userBubble = createMessageBubble('user-msg');
    const textSpan = userBubble.querySelector('.text-content');
    textSpan.innerText = `Muéstrame más información sobre el ${carName}`;
    
    scrollToBottom();
    
    isProcessing = true;
    btnSend.disabled = true;
    
    socket.emit('message', {
        message: `Cuéntame más sobre el ${carName}`,
        session_id: sessionId
    });
}

function navigateCarousel(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const container = carousel.querySelector('.car-carousel-container');
    const cards = carousel.querySelectorAll('.car-card');
    const dots = carousel.querySelectorAll('.carousel-dot');
    let currentIndex = 0;
    
    cards.forEach((card, index) => {
        if (card.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    const newIndex = (currentIndex + direction + cards.length) % cards.length;
    const currentCard = cards[currentIndex];
    const newCard = cards[newIndex];
    
    if (container) {
        container.classList.add('animating');
        setTimeout(() => {
            container.classList.remove('animating');
        }, 900);
    }
    
    currentCard.classList.remove('active', 'slide-in-left', 'slide-in-right');
    
    if (direction > 0) {
        currentCard.classList.add('slide-out-left');
        newCard.classList.add('slide-in-right');
    } else {
        currentCard.classList.add('slide-out-right');
        newCard.classList.add('slide-in-left');
    }
    
    setTimeout(() => {
        currentCard.style.display = 'none';
        currentCard.classList.remove('slide-out-left', 'slide-out-right');
        
        newCard.classList.add('active');
        newCard.style.display = 'block';
    }, 50);
    
    if (dots.length > 0) {
        dots[currentIndex].classList.remove('active');
        dots[newIndex].classList.add('active');
    }
}

function goToCarouselSlide(carouselId, targetIndex) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const container = carousel.querySelector('.car-carousel-container');
    const cards = carousel.querySelectorAll('.car-card');
    const dots = carousel.querySelectorAll('.carousel-dot');
    let currentIndex = 0;
    
    cards.forEach((card, index) => {
        if (card.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    if (currentIndex === targetIndex) return;
    
    const direction = targetIndex > currentIndex ? 1 : -1;
    const currentCard = cards[currentIndex];
    const newCard = cards[targetIndex];
    
    if (container) {
        container.classList.add('animating');
        setTimeout(() => {
            container.classList.remove('animating');
        }, 900);
    }
    
    currentCard.classList.remove('active', 'slide-in-left', 'slide-in-right');
    
    if (direction > 0) {
        currentCard.classList.add('slide-out-left');
        newCard.classList.add('slide-in-right');
    } else {
        currentCard.classList.add('slide-out-right');
        newCard.classList.add('slide-in-left');
    }
    
    setTimeout(() => {
        currentCard.style.display = 'none';
        currentCard.classList.remove('slide-out-left', 'slide-out-right');
        
        newCard.classList.add('active');
        newCard.style.display = 'block';
    }, 50);
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === targetIndex);
    });
}

let currentActiveCarousel = null;

document.addEventListener('keydown', (e) => {
    if (!currentActiveCarousel) return;
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateCarousel(currentActiveCarousel, -1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateCarousel(currentActiveCarousel, 1);
    }
});

function setActiveCarousel(carouselId) {
    currentActiveCarousel = carouselId;
    
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    const container = carousel.querySelector('.car-carousel-container');
    if (!container) return;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                navigateCarousel(carouselId, 1);
            } else {
                navigateCarousel(carouselId, -1);
            }
        }
    }
}

function renderBookingConfirmation(booking) {
    return `
        <div class="booking-confirmation">
            <h3>Prueba de conducción confirmada</h3>
            <p><strong>Vehículo:</strong> ${booking.model || 'N/D'}</p>
            <p><strong>Fecha:</strong> ${booking.date || 'N/D'}</p>
            <p><strong>Hora:</strong> ${booking.time || 'N/D'}</p>
            <p><strong>Confirmación:</strong> ${booking.confirmation_code || 'N/D'}</p>
        </div>
    `;
}

function renderFinancingTable(financing) {
    if (!Array.isArray(financing) || financing.length === 0) {
        return '<p>No hay opciones de financiación disponibles.</p>';
    }
    
    return `
        <div class="financing-table">
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
                    ${financing.map(option => `
                        <tr>
                            <td>${option.term || 'N/D'}</td>
                            <td>${formatPrice(option.monthly_payment)}</td>
                            <td>${option.apr || 'N/D'}</td>
                            <td>${formatPrice(option.total_cost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function formatPrice(price) {
    if (price === null || price === undefined) return 'N/D';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0
    }).format(price);
}

function formatFuelType(fuel) {
    if (!fuel) return 'N/D';
    
    const fuelMap = {
        'DIESEL': 'Diésel',
        'GASOLINE': 'Gasolina',
        'ELECTRIC': 'Eléctrico',
        'HYBRID': 'Híbrido',
        'PLUG_IN_HYBRID': 'Híbrido enchufable',
        'LIQUID_GAS': 'Gas licuado',
        'HYDROGEN': 'Hidrógeno',
        'NATURAL_GAS': 'Gas natural',
        'GLP': 'GLP'
    };
    
    const upperFuel = fuel.toUpperCase();
    return fuelMap[upperFuel] || fuel;
}

function updateStatus(statusData) {
    if (!isProcessing) return;
    
    const statusMessages = {
        'processing': 'Procesando...',
        'searching_inventory': 'Buscando en inventario...',
        'booking_appointment': 'Reservando su cita...',
        'calculating_financing': 'Calculando opciones...'
    };
    
    statusLabel.innerText = statusMessages[statusData.status] || statusData.message || 'Procesando...';
}

function showSkeletonLoader() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    skeleton.id = 'skeleton-loader';
    chatDisplay.appendChild(skeleton);
    scrollToBottom();
}

function removeSkeletonLoader() {
    const skeleton = document.getElementById('skeleton-loader');
    if (skeleton) {
        skeleton.remove();
    }
}

function removeWelcomeMessage() {
    const welcome = document.querySelector('.welcome-message');
    if (welcome) {
        welcome.remove();
    }
}

function displayError(message) {
    const errorBubble = createMessageBubble('ai-msg');
    const textSpan = errorBubble.querySelector('.text-content');
    textSpan.innerText = `Error: ${message}`;
    textSpan.style.color = '#dc2626';
}

function resetUI() {
    isProcessing = false;
    btnSend.disabled = false;
    statusLabel.innerText = "A su servicio";
    removeSkeletonLoader();
}

function sendQueuedMessages() {
    if (messageQueue.length === 0 || isProcessing) return;
    
    isProcessing = true;
    btnSend.disabled = true;
    
    const combinedMessage = messageQueue.join('\n');
    messageQueue = [];
    
    socket.emit('message', {
        message: combinedMessage,
        session_id: sessionId
    });
}

function sendMessage() {
    const message = userQueryInput.value.trim();
    
    if (!message) return;
    
    removeWelcomeMessage();
    
    const userBubble = createMessageBubble('user-msg');
    const textSpan = userBubble.querySelector('.text-content');
    textSpan.innerText = message;
    
    userQueryInput.value = '';
    scrollToBottom();
    
    messageQueue.push(message);
    
    startBatchTimer();
}

function startBatchTimer() {
    clearTimeout(messageBatchTimer);
    messageBatchTimer = setTimeout(() => {
        if (messageQueue.length > 0 && !isProcessing) {
            sendQueuedMessages();
        }
    }, MESSAGE_BATCH_DELAY);
}

function scrollToBottom() {
    chatDisplay.scrollTo({
        top: chatDisplay.scrollHeight,
        behavior: 'smooth'
    });
}

function addPremiumRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

btnSend.addEventListener('click', (e) => {
    addPremiumRipple(e);
    sendMessage();
});

userQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

userQueryInput.addEventListener('focus', () => {
    userQueryInput.parentElement.classList.add('input-focused');
});

userQueryInput.addEventListener('blur', () => {
    userQueryInput.parentElement.classList.remove('input-focused');
});

userQueryInput.addEventListener('input', () => {
    if (messageQueue.length > 0) {
        startBatchTimer();
    }
});

userQueryInput.focus();
