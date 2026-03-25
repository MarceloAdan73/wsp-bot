const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getCatalog() {
  try {
    const response = await axios.get(`${API_URL}/products?status=all`);
    const products = response.data;
    
    if (!products || products.length === 0) {
      return '⚠️ No hay productos disponibles en este momento.';
    }

    let catalog = '📦 *Catálogo disponible*\n\n';
    products.forEach((p, index) => {
      const statusText = p.status === 'reservado' ? ' (RESERVADO)' : '';
      catalog += `${index + 1}. ${p.name} - $${p.price}${statusText}\n`;
    });
    catalog += '\nResponde con el número del producto que te interese.';
    
    return catalog;
  } catch (error) {
    console.error('Error fetching products:', error.message);
    return '⚠️ Error al cargar el catálogo. Por favor intentá más tarde.';
  }
}

async function getProductsByCategory(category) {
  try {
    const response = await axios.get(`${API_URL}/products?category=${category}&status=all`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching products by category:', error.message);
    return [];
  }
}

function getProductByNumber(products, number) {
  if (!products || products.length === 0) return null;
  const index = number - 1;
  return index >= 0 && index < products.length ? products[index] : null;
}

module.exports = { getCatalog, getProductsByCategory, getProductByNumber };