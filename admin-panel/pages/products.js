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

const DEFAULT_CATEGORIES = [
  { id: 'mujer', name: 'Mujer', icon: '👗' },
  { id: 'hombre', name: 'Hombre', icon: '👔' },
  { id: 'ninos', name: 'Niños/as', icon: '🧒' }
];

const SIZE_PRESETS = {
  ropa: { label: 'Ropa (talles letras)', sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  calzado: { label: 'Calzado (talles números)', sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  personalizado: { label: 'Otro (personalizado)', sizes: [] }
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('mujer');
  const [statusFilter, setStatusFilter] = useState('disponible');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', description: '', sizes: [] });
  const [sizePreset, setSizePreset] = useState('ropa');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [sizeStock, setSizeStock] = useState({});
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('loggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    const initData = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
        localStorage.setItem('botwsp_categories', JSON.stringify(res.data));
      } catch (error) {
        const savedCategories = localStorage.getItem('botwsp_categories');
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        }
      }
      fetchProducts();
    };
    initData();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?status=all');
      console.log('Products fetched:', res.data);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      await fetchProducts();
      setSyncMessage('✓ Cambios sincronizados');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (error) {
      setSyncMessage('✗ Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
      name: newCategoryName.trim(),
      icon: '📁'
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('botwsp_categories', JSON.stringify(updated));
    try {
      await api.post('/categories', { categories: updated });
    } catch (error) {
      console.error('Error saving categories:', error);
    }
    setNewCategoryName('');
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (catId) => {
    setCategoryToDelete(catId);
    setShowDeleteCategoryModal(true);
  };

  const confirmDeleteCategory = async () => {
    const updated = categories.filter(c => c.id !== categoryToDelete);
    setCategories(updated);
    localStorage.setItem('botwsp_categories', JSON.stringify(updated));
    try {
      await api.post('/categories', { categories: updated });
    } catch (error) {
      console.error('Error saving categories:', error);
    }
    if (activeCategory === categoryToDelete) setActiveCategory(updated[0]?.id || 'mujer');
    setShowDeleteCategoryModal(false);
    setCategoryToDelete(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validar que haya datos básicos
      if (!form.name || !form.price) {
        setMessage({ type: 'error', text: 'El nombre y precio son obligatorios' });
        setSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('price', form.price);
      formData.append('description', form.description || '');
      formData.append('category', form.category || activeCategory);
      
      let finalSizes;
      if (sizePreset === 'personalizado') {
        finalSizes = customSizeInput || form.sizes.join(',');
      } else {
        finalSizes = selectedSizes.join(',');
      }
      formData.append('sizes', finalSizes);
      
      // Enviar stock por talle solo si hay stock > 0
      let stockData = [];
      if (selectedSizes && selectedSizes.length > 0) {
        stockData = selectedSizes
          .filter(size => (parseInt(sizeStock[size]) || 0) > 0)
          .map(size => ({
            size: size,
            stock: parseInt(sizeStock[size]) || 0
          }));
      }
      formData.append('sizeStock', JSON.stringify(stockData));
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingProduct) {
        formData.append('status', form.status || 'disponible');
        const res = await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        const res = await api.post('/products', formData);
      }
      
      // IMPORTANTE: Recargar productos DESPUÉS de guardar
      await fetchProducts();
      
      // Guardar tipo preferido
      localStorage.setItem('botwsp_pref_sizePreset', sizePreset);
      
      setShowModal(false);
      setEditingProduct(null);
      setForm({ name: '', price: '', description: '', sizes: [] });
      setSelectedSizes([]);
      setSizePreset('ropa');
      setCustomSizeInput('');
      setSizeStock({});
      setImageFile(null);
      setImagePreview(null);
      fetchProducts();
      setMessage({ type: 'success', text: editingProduct ? 'Producto actualizado correctamente' : 'Producto creado correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage({ type: 'error', text: 'Error al guardar: ' + (error.response?.data?.error || error.message) });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (product) => {
    // Fetch fresco del producto DESDE LA API
    const res = await api.get(`/products/${product.id}`);
    const p = res.data;
    
    // Extraer talles desde la API
    let productSizes = [];
    if (p.sizes && typeof p.sizes === 'string') {
      productSizes = p.sizes.split(',').map(s => s.trim()).filter(s => s);
    }
    
    setEditingProduct(p);
    setForm({ 
      name: p.name || '', 
      price: p.price || '', 
      description: p.description || '', 
      category: p.category || 'mujer', 
      status: p.status || 'disponible', 
      sizes: productSizes 
    });
    
    // Stock por talle desde API
    const loadedStock = {};
    if (p.sizeStock && Array.isArray(p.sizeStock)) {
      p.sizeStock.forEach(item => {
        loadedStock[item.size] = item.stock;
      });
    }
    
    setSizeStock(loadedStock);
    setSelectedSizes(productSizes);
    
    // Preset
    if (productSizes.length > 0) {
      const allNumbers = productSizes.every(s => /^\d+$/.test(s));
      setSizePreset(allNumbers ? 'calzado' : 'ropa');
    } else {
      setSizePreset('ropa');
    }
    setCustomSizeInput(p.sizes || '');
    
    setImagePreview(getImageUrl(p.image_url));
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/products/${productToDelete}`);
      fetchProducts();
      setMessage({ type: 'success', text: 'Producto eliminado correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', text: 'Error al eliminar producto' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  const deselectAll = () => {
    setSelectedProducts([]);
  };

  const deleteSelected = async () => {
    try {
      await Promise.all(selectedProducts.map(id => api.delete(`/products/${id}`)));
      fetchProducts();
      setSelectedProducts([]);
      setShowBulkDeleteModal(false);
      setMessage({ type: 'success', text: `${selectedProducts.length} productos eliminados` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting products:', error);
      setMessage({ type: 'error', text: 'Error al eliminar productos' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSell = async (id) => {
    try {
      await api.post(`/products/${id}/sell`);
      fetchProducts();
      setMessage({ type: 'success', text: 'Producto marcado como vendido' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error selling product:', error);
      setMessage({ type: 'error', text: 'Error al vender producto' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleCancelReserve = async (id) => {
    try {
      await api.post(`/products/${id}/cancel-reserve`);
      fetchProducts();
      setMessage({ type: 'success', text: 'Reserva cancelada - producto disponible nuevamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error canceling reserve:', error);
      setMessage({ type: 'error', text: 'Error al cancelar reserva' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleView = async (product) => {
    try {
      const res = await api.get(`/products/${product.id}`);
      setViewingProduct(res.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching product:', error);
      setViewingProduct(product);
      setShowViewModal(true);
    }
  };

  const handleDuplicate = async (product) => {
    try {
      await api.post('/products/duplicate', { productId: product.id });
      fetchProducts();
      setMessage({ type: 'success', text: 'Producto duplicado correctamente (con imagen)' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error duplicating product:', error);
      setMessage({ type: 'error', text: 'Error al duplicar producto' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const filteredProducts = products.filter(p => {
    const categoryMatch = p.category === activeCategory;
    const statusMatch = statusFilter === 'all' || p.status === statusFilter;
    return categoryMatch && statusMatch;
  });

  const getCategoryLabel = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : catId;
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
        {syncMessage && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg text-sm font-medium ${syncMessage.includes('✓') ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
            {syncMessage}
          </div>
        )}
        {message.text && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
            {message.text}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Productos</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
                syncing ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              🔄 {syncing ? '...' : <span className="hidden sm:inline">Sincronizar</span>}
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
            >
              + <span className="hidden sm:inline">Categoría</span><span className="sm:hidden">Cat.</span>
            </button>
            <button
              onClick={() => { 
                const prefSizePreset = localStorage.getItem('botwsp_pref_sizePreset') || 'ropa';
                setShowModal(true); 
                setEditingProduct(null); 
                setForm({ name: '', price: '', description: '', category: activeCategory, sizes: [] });
                setSelectedSizes([]);
                setSizePreset(prefSizePreset);
                setCustomSizeInput('');
                setSizeStock({});
                setImageFile(null); 
                setImagePreview(null);
              }}
              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + <span className="hidden sm:inline">Crear Producto</span><span className="sm:hidden">Producto</span>
            </button>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
          <div className="flex flex-nowrap gap-2 sm:flex-wrap sm:gap-2">
            {categories.map(cat => {
              const catProducts = products.filter(p => p.category === cat.id && p.status === 'disponible');
              const catStock = catProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
              return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 sm:px-4 py-2 rounded-full font-medium transition whitespace-nowrap text-sm ${
                  activeCategory === cat.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {cat.icon} {cat.name}
                <span className="ml-1 text-xs opacity-70">({catStock})</span>
              </button>
            )})}
          </div>
        </div>

        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
              {categories.find(c => c.id === activeCategory)?.icon} {getCategoryLabel(activeCategory)}
            </h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 sm:px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs sm:text-sm dark:bg-gray-800 dark:text-white touch-manipulation"
            >
              <option value="disponible">Disponibles</option>
              <option value="reservado">Reservados</option>
              <option value="vendido">Vendidos</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">({filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0)} unidades)</span>
            {filteredProducts.length > 0 && selectedProducts.length === 0 && (
              <button onClick={selectAll} className="text-blue-600 hover:underline whitespace-nowrap">
                Seleccionar
              </button>
            )}
            {activeCategory && !['mujer', 'hombre', 'ninos'].includes(activeCategory) && (
              <button onClick={() => handleDeleteCategory(activeCategory)} className="text-red-500 hover:underline whitespace-nowrap">
                Eliminar Cat.
              </button>
            )}
          </div>
        </div>

{selectedProducts.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center justify-between">
            <span className="text-red-700 dark:text-red-300 font-medium">
              {selectedProducts.length} producto(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedProducts([])}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Eliminar {selectedProducts.length}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400">No hay productos en esta categoría</p>
            <button
              onClick={() => { 
                setShowModal(true); 
                setEditingProduct(null); 
                setForm({ name: '', price: '', description: '', stock: '', category: activeCategory, sizes: ['S', 'M', 'L', 'XL'] });
                setSelectedSizes(['S', 'M', 'L', 'XL']);
                setSizePreset('ropa');
                setCustomSizeInput('');
                setImageFile(null); 
                setImagePreview(null); 
              }}
              className="mt-4 text-green-600 hover:underline"
            >
              Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                  {product.image_url ? (
                    <img 
                      src={getImageUrl(product.image_url)} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span>Sin imagen</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white truncate">{product.name}</h4>
                  <p className="text-lg font-bold text-green-600">{formatPrice(product.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.status === 'disponible' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                      product.status === 'reservado' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {product.status === 'disponible' ? '✓ Disponible' :
                       product.status === 'reservado' ? '🔒 Reservado' : '✓ Vendido'}
                    </span>
                    {product.status === 'reservado' && product.reserved_by && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">por {product.reserved_by}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.stock} en stock</p>
                  {product.sizeStock && product.sizeStock.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.sizeStock
                        .filter(s => s.stock > 0)
                        .map((s, idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                            {(s.size)}
                          </span>
                        ))}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button onClick={() => handleView(product)} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 py-2 sm:py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/70 text-xs sm:text-sm font-medium touch-manipulation">👁️ Ver</button>
                    <button onClick={() => handleEdit(product)} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 sm:py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-xs sm:text-sm font-medium touch-manipulation">✏️ Editar</button>
                    <button onClick={() => handleDuplicate(product)} className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 py-2 sm:py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/70 text-xs sm:text-sm font-medium touch-manipulation">📋 Duplicar</button>
                    <button onClick={() => handleDelete(product.id)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 sm:py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-xs sm:text-sm font-medium touch-manipulation">🗑️ Eliminar</button>
                  </div>
                  {product.status === 'reservado' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleSell(product.id)} 
                        className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 py-2.5 sm:py-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/70 text-xs sm:text-sm font-bold touch-manipulation"
                      >
                        ✅ Vender
                      </button>
                      <button 
                        onClick={() => handleCancelReserve(product.id)} 
                        className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 py-2.5 sm:py-2 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/70 text-xs sm:text-sm font-bold touch-manipulation"
                      >
                        ↩️ Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md md:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl max-h-[92vh]">
            <div className="relative h-32 sm:h-36 md:h-40 bg-gray-100 dark:bg-gray-700">
              {imagePreview || (editingProduct && editingProduct.image_url) ? (
                <img 
                  src={imagePreview || getImageUrl(editingProduct.image_url)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">📦</span>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300">
                {editingProduct ? 'Editar' : 'Nuevo'} Producto
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 w-7 h-7 rounded-full flex items-center justify-center shadow text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-3 md:p-4 overflow-y-auto max-h-[calc(95vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* PASOS CLAROS */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">📝 Para crear un producto:</p>
                  <ol className="text-xs text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                    <li>Ingresá el nombre y precio</li>
                    <li>Elegí el tipo (ropa/calzado)</li>
                    <li>Seleccioná los talles disponibles</li>
                    <li>Indicá cuántas unidades TENÉS de cada talle</li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">📦 Nombre del producto</label>
                    <input
                      type="text"
                      placeholder="Ej: Remera Oversize"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">💰 Precio ($ARS)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 15000"
                      value={form.price}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setForm({ ...form, price: val });
                      }}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:border-green-500 focus:outline-none"
                      required
                    />
                    {form.price && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Preview: {formatPrice(form.price)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">📝 Descripción (opcional)</label>
                  <input
                    type="text"
                    placeholder="Breve descripción del producto"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">👗 Categoría</label>
                  <select
                    value={form.category || activeCategory}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* PASO 1: Elegir tipo */}
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">1</span>
                    ¿Qué tipo de producto es?
                  </label>
                  <select
                    value={sizePreset}
                    onChange={(e) => {
                      setSizePreset(e.target.value);
                      if (e.target.value !== 'personalizado') {
                        setSelectedSizes(SIZE_PRESETS[e.target.value].sizes);
                        setForm({ ...form, sizes: SIZE_PRESETS[e.target.value].sizes });
                      } else {
                        setSelectedSizes([]);
                        setForm({ ...form, sizes: [] });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  >
                    {Object.entries(SIZE_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                {/* PASO 2: Seleccionar talles */}
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">2</span>
                    ¿Qué talles TENÉS disponibles?
                  </label>
                  {sizePreset !== 'personalizado' ? (
                    <div className="flex flex-wrap gap-2">
                      {SIZE_PRESETS[sizePreset].sizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            const newSizes = selectedSizes.includes(size)
                              ? selectedSizes.filter(s => s !== size)
                              : [...selectedSizes, size];
                            setSelectedSizes(newSizes);
                            setForm({ ...form, sizes: newSizes });
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition ${
                            selectedSizes.includes(size)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej: S, M, L, XL (separados por coma)"
                      value={customSizeInput}
                      onChange={(e) => {
                        setCustomSizeInput(e.target.value);
                        const sizesArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                        setSelectedSizes(sizesArray);
                        setForm({ ...form, sizes: sizesArray });
                      }}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  )}
                  {selectedSizes.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">Talles seleccionados: {selectedSizes.join(', ')}</p>
                  )}
                </div>

                {/* PASO 3: Stock por talle */}
                {selectedSizes.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4">
                    <label className="block text-sm font-bold text-green-800 mb-1">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">3</span>
                      ¿Cuántas unidades TENÉS de cada talle?
                    </label>
                    <p className="text-xs text-green-600 mb-4">Ingresá la cantidad EXACTA que tenés en stock para cada talle</p>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                      {selectedSizes.map(size => (
                        <div key={size} className="bg-white p-2 sm:p-3 rounded-lg border-2 border-green-200 text-center">
                          <div className="text-base sm:text-lg font-bold text-gray-700 mb-1 sm:mb-2">{size}</div>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={sizeStock[size] || ''}
                            onChange={(e) => setSizeStock({ ...sizeStock, [size]: e.target.value })}
                            className="w-full px-1 sm:px-2 py-1.5 sm:py-2 text-center text-base sm:text-lg font-bold border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none touch-manipulation"
                          />
                          <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">unds.</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 bg-white rounded-lg p-3 text-center">
                      <span className="text-gray-500 text-sm">Total en stock: </span>
                      <span className="text-2xl font-bold text-green-600">
                        {Object.values(sizeStock).reduce((sum, val) => sum + (parseInt(val) || 0), 0)}
                      </span>
                      <span className="text-gray-500 text-sm"> unidades</span>
                    </div>
                  </div>
                )}

                {/* Imagen */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Imagen</label>
                  <input
                    key={editingProduct ? editingProduct.id : 'new-product'}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setImageFile(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setImagePreview(reader.result);
                        reader.readAsDataURL(file);
                      } else {
                        setImagePreview(null);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="flex-1 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-3">Confirmar eliminación</h3>
            <p className="text-gray-600 text-sm mb-5">¿Eliminar este producto?</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-red-600">Eliminar {selectedProducts.length} productos</h3>
            <p className="text-gray-600 text-sm mb-5">
              ¿Estás seguro de eliminar {selectedProducts.length} producto(s)? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={deleteSelected} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Eliminar todos</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-3">Eliminar Categoría</h3>
            <p className="text-gray-600 text-sm mb-5">¿Eliminar esta categoría? Los productos no se eliminarán.</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteCategoryModal(false); setCategoryToDelete(null); }} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={confirmDeleteCategory} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-3">Nueva Categoría</h3>
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full mb-4 px-3 py-2 border rounded-lg text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowCategoryModal(false); setNewCategoryName(''); }} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Crear</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-40 md:h-48">
              {viewingProduct.image_url ? (
                <img 
                  src={getImageUrl(viewingProduct.image_url)} 
                  alt={viewingProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}
              <button 
                onClick={() => setShowViewModal(false)}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all text-sm"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-lg md:text-xl font-bold text-white">{viewingProduct.name}</h3>
                <p className="text-xl md:text-2xl font-bold text-green-300">{formatPrice(viewingProduct.price)}</p>
              </div>
            </div>
            
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500 font-semibold">Categoría</p>
                  <p className="font-bold text-gray-800 text-sm capitalize">{getCategoryLabel(viewingProduct.category)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-purple-500 font-semibold">Talles</p>
                  {viewingProduct.sizeStock && viewingProduct.sizeStock.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {viewingProduct.sizeStock.map((s, i) => (
                        <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.size}: {s.stock}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-bold text-gray-800 text-sm">{viewingProduct.sizes || '-'}</p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-500 font-semibold">Stock</p>
                  <p className="font-bold text-gray-800 text-sm">{viewingProduct.stock || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500 font-semibold">Estado</p>
                  <p className="font-bold text-green-600 text-sm">
                    {viewingProduct.status === 'disponible' ? '✓ Disponible' : 
                     viewingProduct.status === 'reservado' ? '🔒 Reservado' : '✓ Vendido'}
                  </p>
                </div>
              </div>

              {viewingProduct.description && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Descripción</p>
                  <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-2">{viewingProduct.description}</p>
                </div>
              )}

              {viewingProduct.status === 'reservado' && viewingProduct.reserved_by && (
                <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-xs text-yellow-600">Reservado por</p>
                      <p className="font-bold text-gray-800">{viewingProduct.reserved_by}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">Fecha</p>
                      <p className="font-bold text-gray-800">{formatDate(viewingProduct.reserved_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setShowViewModal(false); handleEdit(viewingProduct); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium">✏️ Editar</button>
                <button onClick={() => { setShowViewModal(false); setProductToDelete(viewingProduct.id); setShowDeleteModal(true); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-medium">🗑️ Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}