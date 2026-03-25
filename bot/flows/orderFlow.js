const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function createOrder(productId, size, customerName, customerPhone, quantity = 1) {
  try {
    const response = await axios.post(`${API_URL}/orders/bot`, {
      product_id: productId,
      size: size.toUpperCase(),
      customer_name: customerName.trim(),
      customer_phone: customerPhone,
      quantity: quantity,
      status: 'reservado'
    });
    
    return {
      success: true,
      order: response.data
    };
  } catch (error) {
    console.error('Error creating order:', error.message);
    if (error.response) {
      const data = error.response.data;
      console.error('Response data:', data);
      if (data.error === 'no_disponible' || data.success === false) {
        return { success: false, error: data.error || 'no_disponible', message: data.message };
      }
      return { success: false, error: data.error || 'Error', message: data.message || data.error };
    }
    return { success: false, error: 'Error de conexión', message: 'No se pudo conectar con el servidor' };
  }
}

module.exports = { createOrder };