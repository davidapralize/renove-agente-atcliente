import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const MESSAGE_BATCH_DELAY = 2000;

export const useSocket = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusLabel, setStatusLabel] = useState('A su servicio');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const activeAiMessageRef = useRef(null);
  const pendingUIElementsRef = useRef([]);
  const isTextStreamingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const messageQueueRef = useRef([]);
  const messageBatchTimerRef = useRef(null);
  const pendingCarDetectionRef = useRef(null);
  const lastKnownUrlRef = useRef(null);

  const setProcessing = (value) => {
    isProcessingRef.current = value;
    setIsProcessing(value);
  };

  useEffect(() => {
    let socketPath = '/socket.io';
    let socketOrigin = BACKEND_URL;
    
    try {
      const url = new URL(BACKEND_URL);
      socketOrigin = url.origin;
      let urlPath = url.pathname;
      if (urlPath.endsWith('/')) {
        urlPath = urlPath.slice(0, -1);
      }
      if (urlPath && urlPath !== '/') {
        socketPath = urlPath + '/socket.io';
      }
    } catch (error) {
      console.error('[Socket.IO] Error parsing BACKEND_URL:', error);
    }
    
    socketRef.current = io(socketOrigin, {
      path: socketPath,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('connected', (data) => {
      sessionIdRef.current = data.session_id;
      
      const currentPageUrl = getCurrentPageUrl();
      lastKnownUrlRef.current = currentPageUrl;
      socket.emit('set_page_context', {
        session_id: data.session_id,
        page_url: currentPageUrl
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    socket.on('car_detected', (data) => {
      
      if (isProcessingRef.current) {
        pendingCarDetectionRef.current = data;
        return;
      }
      
      setProcessing(true);
      setMessages(prev => prev.filter(msg => msg.type !== 'welcome'));
      
      socket.emit('message', {
        message: 'Hola',
        session_id: sessionIdRef.current
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
      if (isTextStreamingRef.current) {
        pendingUIElementsRef.current.push(data);
      } else {
        renderUIElement(data);
      }
    });

    socket.on('status', (data) => {
      if (!isProcessingRef.current) return;
      
      updateStatus(data);
      if (data.show_skeleton && !isTextStreamingRef.current) {
        showSkeletonLoader();
      }
    });

    socket.on('error', (data) => {
      console.error('[Socket Error]', data);
      setMessages(prev => [...prev, {
        role: 'ai',
        type: 'text',
        content: `Error: ${data.message}`,
        isError: true
      }]);
      resetUI();
    });

    socket.on('message_complete', () => {
      resetUI();
      
      if (pendingCarDetectionRef.current) {
        const carData = pendingCarDetectionRef.current;
        pendingCarDetectionRef.current = null;
        
        setTimeout(() => {
          if (!isProcessingRef.current && sessionIdRef.current) {
            setProcessing(true);
            setMessages(prev => prev.filter(msg => msg.type !== 'welcome'));
            
            socket.emit('message', {
              message: 'Hola',
              session_id: sessionIdRef.current
            });
          }
        }, 500);
        return;
      }
      
      if (messageQueueRef.current.length > 0) {
        startBatchTimer();
      }
    });

    const urlPollInterval = setInterval(() => {
      const currentUrl = getCurrentPageUrl();
      if (currentUrl !== lastKnownUrlRef.current && sessionIdRef.current) {
        lastKnownUrlRef.current = currentUrl;
        socket.emit('set_page_context', {
          session_id: sessionIdRef.current,
          page_url: currentUrl
        });
      }
    }, 1500);

    return () => {
      clearInterval(urlPollInterval);
      clearTimeout(messageBatchTimerRef.current);
      socket.disconnect();
    };
  }, []);

  const getCurrentPageUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageUrlParam = urlParams.get('page_url');
    
    if (pageUrlParam) {
      return decodeURIComponent(pageUrlParam);
    }
    
    try {
      if (window.parent && window.parent !== window) {
        const parentUrl = window.parent.location.href;
        return parentUrl;
      }
    } catch (e) {
      console.log('[URL Detection] Cannot access parent URL (cross-origin)');
    }
    
    const fallbackUrl = window.location.href;
    return fallbackUrl;
  };

  const handleStreamStart = () => {
    if (!isProcessingRef.current) setProcessing(true);
    
    setStatusLabel('Escribiendo...');
    activeAiMessageRef.current = true;
    isTextStreamingRef.current = true;
    
    setMessages(prev => {
      const filtered = prev.filter(msg => msg.type !== 'welcome');
      return [...filtered, { role: 'ai', type: 'text', content: '', isStreaming: true }];
    });
  };

  const handleStreamDelta = (token) => {
    if (!activeAiMessageRef.current) return;
    
    setMessages(prev => {
      const idx = prev.findIndex(msg => msg.role === 'ai' && msg.isStreaming);
      if (idx === -1) return prev;
      const msg = prev[idx];
      return [
        ...prev.slice(0, idx),
        { ...msg, content: msg.content + token },
        ...prev.slice(idx + 1)
      ];
    });
  };

  const handleStreamComplete = () => {
    setMessages(prev => {
      const idx = prev.findIndex(msg => msg.role === 'ai' && msg.isStreaming);
      if (idx === -1) return prev;
      const msg = prev[idx];
      return [
        ...prev.slice(0, idx),
        { ...msg, isStreaming: false },
        ...prev.slice(idx + 1)
      ];
    });
    
    setStatusLabel('A su servicio');
    activeAiMessageRef.current = null;
    isTextStreamingRef.current = false;
    
    if (pendingUIElementsRef.current.length > 0) {
      pendingUIElementsRef.current.forEach((element, index) => {
        setTimeout(() => {
          renderUIElement(element);
        }, index * 150);
      });
      pendingUIElementsRef.current = [];
    }
  };

  const renderUIElement = (data) => {
    removeSkeletonLoader();
    
    setMessages(prev => [...prev, {
      role: 'ai',
      type: 'ui',
      uiType: data.type,
      data: data.data
    }]);
  };

  const updateStatus = (statusData) => {
    const statusMessages = {
      'processing': 'Procesando ...',
      'searching_inventory': 'Buscando en stock ...',
      'booking_appointment': 'Reservando su cita ...',
      'calculating_financing': 'Calculando opciones ...'
    };
    
    setStatusLabel(statusMessages[statusData.status] || statusData.message || 'Procesando ...');
  };

  const showSkeletonLoader = () => {
    setShowSkeleton(true);
  };

  const removeSkeletonLoader = () => {
    setShowSkeleton(false);
  };

  const resetUI = () => {
    setProcessing(false);
    setStatusLabel('A su servicio');
    removeSkeletonLoader();
  };

  const sendQueuedMessages = () => {
    
    if (messageQueueRef.current.length === 0) {
      return;
    }
    
    if (isProcessingRef.current) {
      return;
    }
    
    setProcessing(true);
    
    const combinedMessage = messageQueueRef.current.join('\n');
    messageQueueRef.current = [];
    
    socketRef.current.emit('message', {
      message: combinedMessage,
      session_id: sessionIdRef.current
    });
  };

  const startBatchTimer = () => {
    clearTimeout(messageBatchTimerRef.current);
    messageBatchTimerRef.current = setTimeout(() => {
      if (messageQueueRef.current.length > 0 && !isProcessingRef.current) {
        sendQueuedMessages();
      }
    }, MESSAGE_BATCH_DELAY);
  };

  const sendMessage = (text) => {
    
    if (!socketRef.current) {
      console.error('[Send Message] Socket not initialized');
      return;
    }
    
    if (!sessionIdRef.current) {
      console.error('[Send Message] No session ID - message blocked');
      return;
    }
    
    setMessages(prev => prev.filter(msg => msg.type !== 'welcome'));
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: text }]);
    
    messageQueueRef.current.push(text);
    startBatchTimer();
  };

  const onInputChange = () => {
    if (messageQueueRef.current.length > 0) {
      startBatchTimer();
    }
  };

  const sendSilentMessage = (text) => {
    if (!socketRef.current || !sessionIdRef.current) {
      return;
    }
    
    if (isProcessingRef.current) {
      return;
    }
    
    setProcessing(true);
    setMessages(prev => prev.filter(msg => msg.type !== 'welcome'));
    
    socketRef.current.emit('message', {
      message: text,
      session_id: sessionIdRef.current
    });
  };

  return { messages, sendMessage, sendSilentMessage, isConnected, isProcessing, statusLabel, onInputChange, showSkeleton };
};
