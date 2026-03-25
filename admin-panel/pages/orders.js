import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../lib/api';
import Header from '../components/Header';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const formatPrice = (price) => {
  if (!price && price !== 0) return '-';
  return '$' + Number(price).toLocaleString('es-AR');
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${API_URL}${imageUrl}`;
};

export default function Orders() {
  const [reservedProducts, setReservedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('loggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const productsRes = await api.get(`${API_URL}/products?status=all`);
      const reserved = productsRes.data.filter(p => p.status === 'reservado');
      setReservedProducts(reserved);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async (productId) => {
    setProcessing(true);
    try {
      await api.post(`${API_URL}/products/${productId}/sell`);
      setMessage({ type: 'success', text: 'Producto marcado como vendido' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      fetchData();
    } catch (error) {
      console.error('Error selling product:', error);
      setMessage({ type: 'error', text: 'Error al vender producto' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelReserve = async (productId) => {
    setProcessing(true);
    try {
      await api.post(`${API_URL}/products/${productId}/cancel-reserve`);
      setMessage({ type: 'success', text: 'Reserva cancelada - producto disponible' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      fetchData();
    } catch (error) {
      console.error('Error canceling reserve:', error);
      setMessage({ type: 'error', text: 'Error al cancelar reserva' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Productos Reservados</h2>
          <Link href="/sales" className="text-green-600 hover:underline text-sm sm:text-base">
            Ver ventas →
          </Link>
        </div>

        {message.text && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Cargando...</p>
        ) : reservedProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No hay productos reservados</p>
            <Link href="/dashboard" className="text-green-600 hover:underline">
              Volver al dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {reservedProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  {product.image_url && (
                    <img 
                      src={getImageUrl(product.image_url)} 
                      alt={product.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base truncate">{product.name}</h3>
                    <p className="text-green-600 font-bold text-sm sm:text-base">{formatPrice(product.price)}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Talles: {product.sizes}</p>
                    <p className="text-xs sm:text-sm text-yellow-600 mt-1 truncate">👤 {product.reserved_by}</p>
                    {product.reserved_at && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(product.reserved_at)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleMarkAsSold(product.id)}
                    disabled={processing}
                    className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 py-2.5 sm:py-2.5 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/70 text-sm font-bold disabled:opacity-50 touch-manipulation"
                  >
                    ✅ Vender
                  </button>
                  <button 
                    onClick={() => handleCancelReserve(product.id)}
                    disabled={processing}
                    className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 py-2.5 sm:py-2.5 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/70 text-sm font-bold disabled:opacity-50 touch-manipulation"
                  >
                    ↩️ Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
