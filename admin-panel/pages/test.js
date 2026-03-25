import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Header from '../components/Header';

const API_URL = 'http://localhost:3001';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${API_URL}${imageUrl}`;
};

export default function TestBot() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paginationInfo, setPaginationInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const sendMessage = async (msgText) => {
    if (!msgText || loading) return;

    const userMessage = msgText.trim();
    if (!userMessage) return;

    setMessage('');
    setLoading(true);
    setError('');

    setConversation(prev => [...prev, { role: 'user', text: userMessage }]);

    try {
      const res = await axios.post(`${API_URL}/test/message`, {
        message: userMessage,
        phone: 'test-user'
      });
      const responseText = res.data?.response || res.data?.text || '';
      const pagination = res.data?.pagination || null;
      const products = res.data?.products || [];
      
      setConversation(prev => [...prev, { 
        role: 'bot', 
        text: responseText,
        pagination: pagination,
        products: products
      }]);
      
      if (pagination) {
        setPaginationInfo(pagination);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (direction) => {
    sendMessage(direction === 'next' ? 'next' : 'prev');
  };

  const resetConversation = async () => {
    try {
      await axios.post(`${API_URL}/test/reset`);
      setConversation([]);
      setError('');
      setPaginationInfo(null);
    } catch (err) {
      console.error('Error resetting:', err);
    }
  };

  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Probá el Bot</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Simulá conversaciones con el bot</p>
            </div>
            <button
              onClick={resetConversation}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm"
            >
              Reiniciar
            </button>
          </div>

          <div className="h-[500px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <p className="text-4xl mb-2">💬</p>
                <p>Escribí un mensaje para empezar la conversación</p>
                <p className="text-sm mt-2">Probalo con: "hola"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const msgKey = `msg-${idx}`;
                  return (
                    <div key={msgKey}>
                      <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                        <div className={isUser 
                          ? 'max-w-80 p-3 rounded-lg bg-green-600 text-white'
                          : 'max-w-3xl p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'}>
                          <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                          

                        </div>
                      </div>
                      
                      {msg.role === 'bot' && msg.products && msg.products.length > 0 && (
                        <div className="flex justify-start mt-2 ml-4">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-w-2xl">
                            {msg.products.filter(p => p.image_url).map((img, i) => (
                              <div key={i} className="text-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                <img 
                                  src={getImageUrl(img.image_url)} 
                                  alt={img.name}
                                  className="w-20 h-20 object-cover rounded-lg border mx-auto"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate w-20">{img.name}</p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-bold">${img.price?.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm">
              Error: {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribí tu mensaje..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Comandos útiles para probar:</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>- Escribí "hola" para iniciar</li>
            <li>- Escribí "1" para ver catálogo</li>
            <li>- Elegí una categoría (1-3) para ver productos</li>
            <li>- Usá los botones "Atrás/Ver más" para navegar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}