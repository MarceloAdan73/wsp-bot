import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api, { API_URL } from '../lib/api';
import Header from '../components/Header';

const formatPrice = (price) => {
  if (!price && price !== 0) return '-';
  return '$' + Number(price).toLocaleString('es-AR');
};

const formatTotal = (amount) => {
  return '$' + Number(amount).toLocaleString('es-AR');
};

export default function Ventas() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('loggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const res = await api.get(`${API_URL}/orders`);
      const soldOrders = res.data.filter(o => o.status === 'vendido');
      setOrders(soldOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVendido = orders.reduce((sum, o) => sum + (o.product_price || 0), 0);

  const handleDeleteOrder = async (orderId) => {
    try {
      await api.delete(`${API_URL}/orders/${orderId}`);
      setMessage({ type: 'success', text: 'Venta eliminada correctamente' });
      setConfirmDelete(null);
      fetchOrders();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting order:', error);
      setMessage({ type: 'error', text: 'Error al eliminar la venta' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Ventas</h2>
          <Link href="/pedidos" className="text-green-600 hover:underline text-sm sm:text-base">
            ← Volver a Pedidos
          </Link>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">Total vendido</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">{formatTotal(totalVendido)}</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 dark:text-green-400 text-sm">{orders.length} venta{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Cargando...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay ventas realizadas</p>
            <Link href="/pedidos" className="text-green-600 hover:underline mt-4 inline-block">
              Volver a pedidos
            </Link>
          </div>
        ) : (
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Producto</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Talle</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Precio</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {order.product_name || `Producto #${order.product_id}`}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">{order.size}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {formatPrice(order.product_price)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white">{order.customer_name}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(order.created_at)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                        {order.id && (
                          <button 
                            onClick={() => setConfirmDelete(order.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs sm:text-sm"
                          >
                            🗑 Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="md:hidden space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base pr-2">
                  {order.product_name || `Producto #${order.product_id}`}
                </h3>
                <span className="text-green-600 dark:text-green-400 font-bold text-sm sm:text-base whitespace-nowrap">
                  {formatPrice(order.product_price)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Talle:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">{order.size || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDate(order.created_at)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">Cliente:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{order.customer_name}</span>
                </div>
                {order.id && (
                  <button 
                    onClick={() => setConfirmDelete(order.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs sm:text-sm touch-manipulation"
                  >
                    🗑 Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 sm:mt-6 text-center sm:text-left text-sm text-gray-500 dark:text-gray-400">
          <p>Total: {orders.length} venta{orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Eliminar Venta</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">¿Eliminar esta venta del historial? Esta acción no se puede deshacer.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors touch-manipulation"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteOrder(confirmDelete)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors touch-manipulation"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
