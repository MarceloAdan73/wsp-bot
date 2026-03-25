import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api, { API_URL } from '../lib/api';
import Header from '../components/Header';

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

export default function Ventas() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('loggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const res = await api.get(`${API_URL}/products?status=vendido`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const handleDeleteClick = (id) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`${API_URL}/products/${productToDelete}`);
      setProducts(products.filter(p => p.id !== productToDelete));
      setMessage({ type: 'success', text: 'Producto eliminado correctamente' });
      setSelectedProduct(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el producto' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Productos Vendidos</h2>
          <Link href="/dashboard" className="text-green-600 hover:underline text-sm sm:text-base">
            ← Dashboard
          </Link>
        </div>

        {message && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Cargando...</p>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No hay productos vendidos</p>
            <Link href="/dashboard" className="text-green-600 hover:underline">
              Volver al dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Imagen</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Producto</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Precio</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reservado por</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          {product.image_url ? (
                            <img 
                              src={getImageUrl(product.image_url)} 
                              alt={product.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              Sin img
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white font-medium">{formatPrice(product.price)}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">{product.reserved_by || '-'}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(product.reserved_at)}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                          <button 
                            onClick={() => handleDeleteClick(product.id)}
                            className="text-red-600 dark:text-red-400 hover:underline mr-3"
                          >
                            Eliminar
                          </button>
                          <button 
                            onClick={() => setSelectedProduct(product)}
                            className="text-pink-600 dark:text-pink-400 hover:underline"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {products.map((product) => (
                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {product.image_url && (
                      <img 
                        src={getImageUrl(product.image_url)} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base truncate">{product.name}</h3>
                      <p className="text-green-600 dark:text-green-400 font-bold text-sm sm:text-base">{formatPrice(product.price)}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">👤 {product.reserved_by || '-'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(product.reserved_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 py-2.5 rounded-lg hover:bg-pink-200 text-sm font-medium touch-manipulation"
                    >
                      👁️ Ver
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(product.id)}
                      className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 py-2.5 rounded-lg hover:bg-red-200 text-sm font-medium touch-manipulation"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-40 sm:h-48">
              {selectedProduct.image_url ? (
                <img 
                  src={getImageUrl(selectedProduct.image_url)} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all text-sm"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-lg font-bold text-white">{selectedProduct.name}</h3>
                <p className="text-xl font-bold text-green-300">{formatPrice(selectedProduct.price)}</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="bg-pink-50 dark:bg-pink-900/30 rounded-lg p-2 text-center">
                  <p className="text-xs text-pink-500 font-semibold">Categoría</p>
                  <p className="font-bold text-gray-800 dark:text-white text-sm capitalize">{selectedProduct.category}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2 text-center">
                  <p className="text-xs text-purple-500 font-semibold">Talles</p>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{selectedProduct.sizes || '-'}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-500 font-semibold">Stock</p>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{selectedProduct.stock || 0}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500 font-semibold">Estado</p>
                  <p className="font-bold text-green-600 text-sm">✓ Vendido</p>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Descripción</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2">{selectedProduct.description}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comprador</p>
                    <p className="font-bold text-gray-800 dark:text-white">{selectedProduct.reserved_by || 'No registrado'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                    <p className="font-bold text-gray-800 dark:text-white">{formatDate(selectedProduct.reserved_at)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedProduct(null); handleDeleteClick(selectedProduct.id); }}
                  className="flex-1 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 text-red-600 dark:text-red-400 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors touch-manipulation"
                >
                  🗑 Eliminar
                </button>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors touch-manipulation"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Eliminar Producto</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">¿Eliminar este producto vendido? Esta acción no se puede deshacer.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors touch-manipulation"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
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
