import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
// EL TRUCO: añadir "?inline" para importar el CSS como texto
import styles from './index.css?inline'; 

const WIDGET_ID = 'renove-ai-widget-root';

if (!document.getElementById(WIDGET_ID)) {
  const host = document.createElement('div');
  host.id = WIDGET_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  
  // 1. Inyectamos los estilos dentro del Shadow DOM
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);

  // 2. Montamos la app
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>
  );
}