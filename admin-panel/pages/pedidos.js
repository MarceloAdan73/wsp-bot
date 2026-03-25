import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import Header from '../components/Header';

const formatPrice = (price) => {
  if (!price && price !== 0) return '-';
  return '$' + Number(price).toLocaleString('es-AR');
};

export default function Pedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('reservado');
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

  useEffect(() => {
    if (filter === 'vendido') {
      router.push('/ventas');
    }
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      
      fetchOrders();
      setMessage({ type: 'success', text: newStatus === 'vendido' ? 'Venta confirmada' : 'Reserva cancelada, producto liberado' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage({ type: 'error', text: 'Error al actualizar pedido' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      setMessage({ type: 'success', text: 'Producto eliminado correctamente' });
      setConfirmDelete(null);
      fetchOrders();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el producto' });
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

  const filteredOrders = filter === 'all' 
    ? orders.filter(o => o.status !== 'cancelado')
    : orders.filter(o => o.status === filter);

  const statusColors = {
    reservado: 'bg-yellow-100 text-yellow-800',
    vendido: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pedidos</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="reservado">Reservados ({orders.filter(o => o.status === 'reservado').length})</option>
            <option value="all">Todos ({orders.filter(o => o.status !== 'cancelado').length})</option>
          </select>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay pedidos con este filtro</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Talle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">#{order.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {order.product_name || `Producto #${order.product_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatPrice(order.product_price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{order.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.customer_phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'reservado' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                        order.status === 'vendido' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                        'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4 text-sm">
                      {order.status === 'reservado' && (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => updateStatus(order.id, 'vendido', order.product_id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium text-xs bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded"
                          >
                            ✓ Vender
                          </button>
                          <button 
                            onClick={() => updateStatus(order.id, 'cancelado', order.product_id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-xs bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded"
                          >
                            ✕ Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>Total de pedidos: {filteredOrders.length}</p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Eliminar Producto</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">¿Eliminar este producto? Esta acción no se puede deshacer.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteProduct(confirmDelete)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors"
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