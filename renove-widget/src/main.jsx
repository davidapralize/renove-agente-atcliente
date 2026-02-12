import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import './index.css'; // Esto se inyectará automáticamente

const WIDGET_ID = 'renove-ai-widget-root';

// Evitar duplicados
if (!document.getElementById(WIDGET_ID)) {
  const host = document.createElement('div');
  host.id = WIDGET_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  
  // Contenedor interno para React
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  // Inyectamos estilos (Vite se encarga de poner el CSS aquí en el build)
  const styleSlot = document.createElement('style');
  shadow.appendChild(styleSlot);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>
  );
}