import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import styles from './index.css?inline'; 

const WIDGET_ID = 'renove-ai-widget-root';
const FONT_ID = 'renove-ai-widget-font';

if (!document.getElementById(FONT_ID)) {
  const fontLink = document.createElement('link');
  fontLink.id = FONT_ID;
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(fontLink);
}

if (!document.getElementById(WIDGET_ID)) {
  const host = document.createElement('div');
  host.id = WIDGET_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>
  );
}