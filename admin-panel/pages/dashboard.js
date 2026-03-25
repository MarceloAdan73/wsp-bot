import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../lib/api';
import Header from '../components/Header';
import { useSSE } from '../hooks/useSSE';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ products: 0, reserved: 0, sold: 0 });
  const [loading, setLoading] = useState(true);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const { connected, on } = useSSE();

  useEffect(() => {
    const token = localStorage.getItem('loggedIn');
    if (!token) {
      router.push('/');
      return;
    }
  }, [router]);

  useEffect(() => {
    on('new_order', (data) => {
      setRealtimeEvents(prev => [{
        type: 'order',
        message: `Nuevo pedido: ${data.productName} - ${data.customerName}`,
        timestamp: data.timestamp
      }, ...prev].slice(0, 10));
      fetchStats();
    });

    on('new_reservation', (data) => {
      setRealtimeEvents(prev => [{
        type: 'reservation',
        message: `Nueva reserva: ${data.productName} - Talle ${data.talle}`,
        timestamp: data.timestamp
      }, ...prev].slice(0, 10));
      fetchStats();
    });

    on('new_sale', (data) => {
      setRealtimeEvents(prev => [{
        type: 'sale',
        message: `Venta concretada: ${data.productName}`,
        timestamp: data.timestamp
      }, ...prev].slice(0, 10));
      fetchStats();
    });
  }, [on]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const allRes = await api.get('/products?status=all');
      const allProducts = allRes.data;
      const ordersRes = await api.get('/orders');
      const allOrders = ordersRes.data;

      // Productos disponibles: suma de stock real de productos NO vendidos
      const available = allProducts
        .filter(p => p.status !== 'vendido')
        .reduce((sum, p) => sum + (p.stock || 0), 0);
      const reserved = allOrders.filter(o => o.status === 'reservado').length;
      const sold = allOrders.filter(o => o.status === 'vendido').length;

      setStats({
        products: available,
        reserved: reserved,
        sold: sold
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Productos Disponibles</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '...' : stats.products}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <Link href="/products" className="text-green-600 text-sm mt-4 inline-block hover:underline">
              Ver productos →
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Pedidos</p>
                <p className="text-3xl font-bold text-blue-600">{loading ? '...' : stats.reserved}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <Link href="/pedidos" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
              Ver pedidos →
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Ventas</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '...' : stats.sold}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link href="/ventas" className="text-green-600 text-sm mt-4 inline-block hover:underline">
              Ver ventas →
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Bienvenido al Panel de Administración</h3>
          <p className="text-gray-600 dark:text-gray-300">Desde aquí podés gestionar los productos de tu tienda BotWsp.</p>
        </div>

        {stats.reserved > 0 && (
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
              Tenés {stats.reserved} reserva(s) sin confirmar
            </h3>
            <Link href="/pedidos" className="text-yellow-700 dark:text-yellow-400 text-sm mt-4 inline-block hover:underline">
              Ver pedidos →
            </Link>
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Actividad en Tiempo Real</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{connected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
          {realtimeEvents.length > 0 ? (
            <div className="space-y-2">
              {realtimeEvents.map((event, idx) => (
                <div key={idx} className={`p-3 rounded-lg flex items-center gap-3 ${
                  event.type === 'sale' ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' :
                  event.type === 'reservation' ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' :
                  'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}>
                  <span className="text-lg">
                    {event.type === 'sale' ? '💰' : event.type === 'reservation' ? '📦' : '🛒'}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{event.message}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Sin actividad reciente. Esperando eventos...</p>
          )}
        </div>
      </div>
    </div>
  );
}
