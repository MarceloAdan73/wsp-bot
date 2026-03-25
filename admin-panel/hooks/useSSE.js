import { useEffect, useRef, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSSE() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const eventSourceRef = useRef(null);
  const listenersRef = useRef({});

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_URL}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE conectado');
      setConnected(true);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnected(false);
      eventSource.close();
      setTimeout(connect, 5000);
    };

    eventSource.addEventListener('connected', (e) => {
      console.log('SSE handshake:', JSON.parse(e.data));
    });

    eventSource.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [data, ...prev].slice(0, 50));
      if (listenersRef.current.notification) {
        listenersRef.current.notification(data);
      }
    });

    eventSource.addEventListener('new_order', (e) => {
      const data = JSON.parse(e.data);
      if (listenersRef.current.new_order) {
        listenersRef.current.new_order(data);
      }
    });

    eventSource.addEventListener('new_reservation', (e) => {
      const data = JSON.parse(e.data);
      if (listenersRef.current.new_reservation) {
        listenersRef.current.new_reservation(data);
      }
    });

    eventSource.addEventListener('product_update', (e) => {
      const data = JSON.parse(e.data);
      if (listenersRef.current.product_update) {
        listenersRef.current.product_update(data);
      }
    });

    eventSource.addEventListener('new_sale', (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [data, ...prev].slice(0, 50));
      if (listenersRef.current.new_sale) {
        listenersRef.current.new_sale(data);
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

  const on = useCallback((event, callback) => {
    listenersRef.current[event] = callback;
  }, []);

  const off = useCallback((event) => {
    delete listenersRef.current[event];
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    events,
    connect,
    disconnect,
    on,
    off,
    clearEvents
  };
}
