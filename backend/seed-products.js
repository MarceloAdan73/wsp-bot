require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

const PRODUCTS = [
  // MUJER - 5 productos
  {
    name: 'Remera Oversize Algodón',
    price: 18500,
    description: 'Remera oversize de algodón 100%. Diseño moderno y cómodo para uso diario.',
    category: 'mujer',
    sizes: 'XS,S,M,L,XL',
    sizeStock: [
      { size: 'XS', stock: 3 },
      { size: 'S', stock: 5 },
      { size: 'M', stock: 4 },
      { size: 'L', stock: 3 },
      { size: 'XL', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&h=500&fit=crop&crop=top'
  },
  {
    name: 'Jean Wide Leg Elastizado',
    price: 38000,
    description: 'Jean wide leg de tela elastizada. Talle real, cómodo y moderno.',
    category: 'mujer',
    sizes: '24,26,28,30,32',
    sizeStock: [
      { size: '24', stock: 2 },
      { size: '26', stock: 4 },
      { size: '28', stock: 5 },
      { size: '30', stock: 3 },
      { size: '32', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop'
  },
  {
    name: 'Vestido Midi Estampado',
    price: 45000,
    description: 'Vestido midi con estampado floral. Perfecto para ocasiones especiales.',
    category: 'mujer',
    sizes: 'S,M,L,XL',
    sizeStock: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 3 },
      { size: 'L', stock: 2 },
      { size: 'XL', stock: 1 }
    ],
    image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop'
  },
  {
    name: 'Buzo Friza Premium',
    price: 42000,
    description: 'Buzo de friza premium con capucha. Cálido y con bolsillo canguro.',
    category: 'mujer',
    sizes: 'S,M,L,XL,XXL',
    sizeStock: [
      { size: 'S', stock: 3 },
      { size: 'M', stock: 4 },
      { size: 'L', stock: 3 },
      { size: 'XL', stock: 2 },
      { size: 'XXL', stock: 1 }
    ],
    image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop'
  },
  {
    name: 'Campera de Jean',
    price: 55000,
    description: 'Campera de jean clásica. Temporada actual.',
    category: 'mujer',
    sizes: 'S,M,L,XL',
    sizeStock: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 3 },
      { size: 'L', stock: 2 },
      { size: 'XL', stock: 1 }
    ],
    image_url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&h=500&fit=crop'
  },

  // HOMBRE - 5 productos
  {
    name: 'Remera Básica Premium',
    price: 15000,
    description: 'Remera básica de algodón peinado. Talles reales, no achican.',
    category: 'hombre',
    sizes: 'S,M,L,XL,XXL',
    sizeStock: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 6 },
      { size: 'L', stock: 5 },
      { size: 'XL', stock: 3 },
      { size: 'XXL', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop'
  },
  {
    name: 'Buzo Oversize Con Capucha',
    price: 48000,
    description: 'Buzo oversize de friza con capucha y bolsillo canguro. Ideal para el frío.',
    category: 'hombre',
    sizes: 'M,L,XL,XXL',
    sizeStock: [
      { size: 'M', stock: 3 },
      { size: 'L', stock: 4 },
      { size: 'XL', stock: 3 },
      { size: 'XXL', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=500&fit=crop'
  },
  {
    name: 'Pantalón Cargo Moderno',
    price: 35000,
    description: 'Pantalón cargo con bolsillos laterales. Tela resistente y moderna.',
    category: 'hombre',
    sizes: 'S,M,L,XL',
    sizeStock: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 4 },
      { size: 'L', stock: 4 },
      { size: 'XL', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop'
  },
  {
    name: 'Jean Clásico Recto',
    price: 32000,
    description: 'Jean clásico de corte recto. Tela de calidad con algo de elastano.',
    category: 'hombre',
    sizes: '28,30,32,34,36',
    sizeStock: [
      { size: '28', stock: 2 },
      { size: '30', stock: 4 },
      { size: '32', stock: 5 },
      { size: '34', stock: 3 },
      { size: '36', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop'
  },
  {
    name: 'Camisa Oxford Manga Larga',
    price: 28000,
    description: 'Camisa oxford de manga larga. Para uso casual o formal.',
    category: 'hombre',
    sizes: 'S,M,L,XL',
    sizeStock: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 3 },
      { size: 'L', stock: 3 },
      { size: 'XL', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop'
  },

  // NIÑOS - 5 productos
  {
    name: 'Remera Estampada Infantil',
    price: 9500,
    description: 'Remera con estampado colorido. Algodón suave para niños.',
    category: 'ninos',
    sizes: '4,6,8,10,12',
    sizeStock: [
      { size: '4', stock: 3 },
      { size: '6', stock: 4 },
      { size: '8', stock: 3 },
      { size: '10', stock: 2 },
      { size: '12', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=500&fit=crop'
  },
  {
    name: 'Jean Elastizado Niño',
    price: 18000,
    description: 'Jean elastizado para niño. Cómodo y resistente para el uso diario.',
    category: 'ninos',
    sizes: '4,6,8,10,12,14',
    sizeStock: [
      { size: '4', stock: 2 },
      { size: '6', stock: 3 },
      { size: '8', stock: 4 },
      { size: '10', stock: 3 },
      { size: '12', stock: 2 },
      { size: '14', stock: 1 }
    ],
    image_url: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=500&fit=crop'
  },
  {
    name: 'Buzo Friza Niño',
    price: 22000,
    description: 'Buzo de friza suave con capucha. Ideal para el invierno.',
    category: 'ninos',
    sizes: '4,6,8,10,12',
    sizeStock: [
      { size: '4', stock: 2 },
      { size: '6', stock: 3 },
      { size: '8', stock: 3 },
      { size: '10', stock: 2 },
      { size: '12', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=500&fit=crop'
  },
  {
    name: 'Vestido Niña',
    price: 14000,
    description: 'Vestido para niña. Perfecto para ocasiones especiales.',
    category: 'ninos',
    sizes: '4,6,8,10,12',
    sizeStock: [
      { size: '4', stock: 2 },
      { size: '6', stock: 3 },
      { size: '8', stock: 2 },
      { size: '10', stock: 2 },
      { size: '12', stock: 1 }
    ],
    image_url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&h=500&fit=crop'
  },
  {
    name: 'Short Jean Niño',
    price: 12500,
    description: 'Short de jean para niño. Resistente y con estilo.',
    category: 'ninos',
    sizes: '4,6,8,10,12',
    sizeStock: [
      { size: '4', stock: 3 },
      { size: '6', stock: 4 },
      { size: '8', stock: 3 },
      { size: '10', stock: 2 },
      { size: '12', stock: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=500&fit=crop'
  }
];

async function getAuthToken() {
  try {
    const res = await axios.post(`${API_URL}/auth`, {
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
    return res.data.token;
  } catch (error) {
    console.error('Error obteniendo token:', error.message);
    process.exit(1);
  }
}

async function seedProducts() {
  console.log('🌱 Iniciando carga de productos de prueba...\n');
  
  const token = await getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Primero eliminar productos existentes
  console.log('🗑️ Eliminando productos existentes...');
  try {
    await axios.delete(`${API_URL}/products`, { headers });
    console.log('✅ Productos eliminados\n');
  } catch (error) {
    console.log('⚠️ No se pudieron eliminar productos existentes\n');
  }

  let created = 0;
  let errors = 0;

  for (const product of PRODUCTS) {
    try {
      await axios.post(`${API_URL}/products`, product, { headers });
      created++;
      console.log(`✅ ${product.name}`);
    } catch (error) {
      errors++;
      console.log(`❌ Error: ${product.name}`);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Creados: ${created}`);
  console.log(`   Errores: ${errors}`);
  
  if (errors === 0) {
    console.log('\n🎉 ¡Productos cargados con imágenes de ropa!');
  }
}

seedProducts();
