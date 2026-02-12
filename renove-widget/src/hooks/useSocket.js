import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

// IMPORTANTE: Cambia esto por tu dominio real cuando subas a producción
// Si estás probando en local, usa http://localhost:8104 o el puerto de tu backend
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const useSocket = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    
    // Streaming de texto
    socket.on('chat_token', (data) => {
      setIsTyping(true);
      if (data.type === 'text_start') {
        setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: '' }]);
      } else if (data.type === 'text_delta') {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.type === 'text') {
            return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + data.token }];
          }
          return prev;
        });
      } else if (data.type === 'text_complete') {
        setIsTyping(false);
      }
    });

    // Elementos visuales (Coches, Citas)
    socket.on('ui_element', (data) => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        type: 'ui', 
        uiType: data.type, 
        data: data.data 
      }]);
      setIsTyping(false);
    });

    socket.on('status', (data) => {
      if (data.show_skeleton) setIsTyping(true);
    });

    return () => socket.disconnect();
  }, []);

  const sendMessage = (text) => {
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: text }]);
    socketRef.current.emit('message', { message: text });
  };

  return { messages, sendMessage, isConnected, isTyping };
};