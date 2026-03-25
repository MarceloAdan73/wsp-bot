const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

const DEFAULT_CATEGORIES = [
  { id: 'mujer', name: 'Mujer', icon: '👗' },
  { id: 'hombre', name: 'Hombre', icon: '👔' },
  { id: 'ninos', name: 'Niños/as', icon: '🧒' }
];

async function getCategories() {
  try {
    const response = await axios.get(`${API_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return DEFAULT_CATEGORIES;
  }
}

async function getMenu() {
  const categories = await getCategories();
  
  let menu = `👋 *Bienvenida a BotWsp Store*\n\nElige una opción:\n\n`;
  
  categories.forEach((cat, index) => {
    menu += `${index + 1}️⃣ ${cat.icon} ${cat.name}\n`;
  });
  
  menu += `\n📦 Ver todo el catálogo\n📍 Dirección del showroom\n💬 Hablar con la dueña`;
  
  return menu;
}

module.exports = { getMenu, getCategories };