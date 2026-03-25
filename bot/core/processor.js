const tienda = require('../config/tienda');
const { getCatalog, getProductsByCategory, getProductByNumber } = require('../flows/catalogFlow');
const { createOrder } = require('../flows/orderFlow');
const { getCategories } = require('../flows/menuFlow');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const PRODUCTS_PER_PAGE = 10;
const DEFAULT_CATEGORIES = [
  { id: 'mujer', name: 'Mujer', icon: '👗' },
  { id: 'hombre', name: 'Hombre', icon: '👔' },
  { id: 'ninos', name: 'Niños/as', icon: '🧒' }
];

class MessageProcessor {
  constructor(options = {}) {
    this.isTest = options.isTest || false;
    this.sock = options.sock || null;
    this.userStates = {};
    this.notifications = [];
    this.lastCleanup = Date.now();
    this.cleanupInterval = 1000 * 60 * 15; // 15 minutos
  }

  addNotification(phone, message, type = 'atencion') {
    this.notifications.push({
      id: Date.now(),
      phone,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  getNotifications() {
    return this.notifications;
  }

  async getDynamicCategories() {
    try {
      const cats = await getCategories();
      return cats && cats.length > 0 ? cats : DEFAULT_CATEGORIES;
    } catch (error) {
      console.error('Error getting categories:', error.message);
      return DEFAULT_CATEGORIES;
    }
  }

  async sendImage(jid, imageUrl, caption) {
    if (this.isTest || !this.sock) {
      // Modo test: solo registrar
      console.log(`[TEST] Enviaría imagen: ${imageUrl} con caption: ${caption}`);
      return { test: true, imageUrl, caption };
    }

    try {
      const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`;
      const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      await this.sock.sendMessage(jid, {
        image: buffer,
        caption: caption
      });
    } catch (error) {
      console.error('Error sending image:', error.message);
      await this.sock.sendMessage(jid, { text: caption });
    }
  }

  getMenu() {
    return `✨ *BIENVENIDA A ${tienda.nombre.toUpperCase()}* ✨\n\n👋 *Estás chateando con nuestro asistente automático*\n\nAcá podés ver todos los productos disponibles y reservar lo que te guste. Pronto nos contactaremos con vos para confirmar y cerrar la venta.\n\n📋 *¿Qué puedo hacer por vos?*\n\n1️⃣ 👗 *Ver Catálogo* - Explorá todas nuestras prendas\n2️⃣ 🔥 *Ver Ofertas* - Promociones vigentes\n3️⃣ 📍 *Ubicación* - Dónde encontrarnos\n4️⃣ ❓ *Preguntas Frecuentes*\n5️⃣ 📦 *Envíos* - Opciones de entrega\n6️⃣ 💳 *Medios de Pago*\n7️⃣ 🔄 *Cambios y Devoluciones*\n8️⃣ 💬 *Atención Personal* - Hablar con alguien de la tienda\n\n👉 *Elegí una opción* (escribí el número)\n\n💡 *Tip:* Escribí "menu" cuando quieras ver estas opciones de nuevo ${tienda.frases.emojisFavoritos[0]}`;
  }

  async processMessage(messageText, jid, phone) {
    this.ensureCleanup();
    
    const text = messageText || '';
    
    if (!text.trim()) {
      return this.isTest ? { response: 'Por favor ingresa un mensaje' } : null;
    }

    const normalizedText = text.trim().toLowerCase();
    const currentState = this.userStates[phone]?.state || 'menu-principal';
    const currentData = this.userStates[phone]?.data || {};

    // Procesar comandos especiales en test
    if (this.isTest && normalizedText === 'reset') {
      this.resetStates();
      return { response: '✅ Estados reiniciados' };
    }

    // Saludos
    if (normalizedText === 'hola' || normalizedText === 'hi' || normalizedText === 'menu' || normalizedText === 'holii') {
      this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
      const greeting = tienda.frases.saludo[Math.floor(Math.random() * tienda.frases.saludo.length)];
      const response = `${greeting} ¿En qué te puedo ayudar? ${tienda.frases.emojisFavoritos[0]}\n\n${this.getMenu()}`;
      return this.isTest ? { response } : await this.sendText(jid, response);
    }

    // Despedidas
    if (normalizedText === 'gracias' || normalizedText === 'gracias!' || normalizedText === 'chao' || normalizedText === 'chau') {
      const goodbye = tienda.frases.despedida[Math.floor(Math.random() * tienda.frases.despedida.length)];
      delete this.userStates[phone];
      const response = `${goodbye}\n\n💬 Respondemos rápido, no te quedes con dudas\n\n📱 Seguinos en Instagram: ${tienda.redes.instagram} ${tienda.frases.emojisFavoritos[1]}`;
      return this.isTest ? { response } : await this.sendText(jid, response);
    }

    // Actualizar lastActivity
    if (this.userStates[phone]) {
      this.userStates[phone].lastActivity = Date.now();
    }

    // Manejar según estado
    switch (currentState) {
      case 'menu-principal':
        return await this.handleMenuState(jid, phone, normalizedText, currentData);
      case 'esperando-categoria':
        return await this.handleCategorySelection(jid, phone, normalizedText, currentData);
      case 'esperando-ejemplo':
        return await this.handleExampleSelection(jid, phone, normalizedText, currentData);
      case 'esperando-producto':
        if (normalizedText === 'siguiente' || normalizedText === 'sigiente' || normalizedText === '>') {
          return await this.handlePagination(jid, phone, 'next', currentData);
        } else if (normalizedText === 'anterior' || normalizedText === '<' || normalizedText === 'atras') {
          return await this.handlePagination(jid, phone, 'prev', currentData);
        }
        return await this.handleProductSelection(jid, phone, normalizedText, currentData);
      case 'esperando-nombre-y-talle':
        return await this.handleNameAndSizeInput(jid, phone, text.trim(), currentData);
      case 'esperando-talle':
        return await this.handleSizeSelection(jid, phone, normalizedText, currentData);
      case 'esperando-nombre':
        return await this.handleNameInput(jid, phone, text.trim(), currentData);
      case 'post-reserva':
        // Después de reserva, responder sin saludo siempre
        this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
        return await this.handleMenuState(jid, phone, text, currentData);
      default:
        this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
        const menuResponse = this.getMenu();
        return this.isTest ? { response: menuResponse } : await this.sendText(jid, menuResponse);
    }
  }

  async sendText(jid, text) {
    if (this.isTest || !this.sock) {
      console.log(`[TEST] Enviaría texto a ${jid}: ${text.substring(0, 50)}...`);
      return { test: true, text };
    }
    return await this.sock.sendMessage(jid, { text });
  }

  async sendListMessage(jid, title, text, sections) {
    if (this.isTest || !this.sock) {
      console.log(`[TEST] Enviaría lista a ${jid}: ${title}`);
      return { test: true, title, text };
    }
    return await this.sock.sendMessage(jid, {
      text: text,
      sections: sections,
      title: title,
      buttonText: 'Ver opciones'
    });
  }

  async sendButtonsMessage(jid, text, buttons) {
    if (this.isTest || !this.sock) {
      console.log(`[TEST] Enviaría botones a ${jid}`);
      return { test: true, text, buttons };
    }
    return await this.sock.sendMessage(jid, {
      text: text,
      buttons: buttons,
      headerType: 1
    });
  }

  async handleMenuState(jid, phone, text, data) {
    const t = tienda;
    let response = '';

    switch (text) {
      case '1':
        const categories = await this.getDynamicCategories();
        let menuCatalogo = `👗 *CATÁLOGO DISPONIBLE*\n\nElegí una categoría:\n\n`;
        categories.forEach((cat, index) => {
          menuCatalogo += `${index + 1}️⃣ ${cat.icon} *${cat.name}*\n`;
        });
        menuCatalogo += `\nEscribí el número de la categoría que te interesa`;
        this.userStates[phone] = { state: 'esperando-categoria', data: { categories }, lastActivity: Date.now() };
        response = menuCatalogo;
        break;
      case '2':
        const promos = t.promociones.map(p => `• *${p.titulo}*: ${p.condicion} (${p.vigencia})`).join('\n');
        response = `👗 *Ofertas de ${t.nombre}*\n\n${promos}\n\n${t.diferenciales[5]} ${t.frases.emojisFavoritos[1]}`;
        break;
      case '3':
        response = `👗 *Ubicación*\n\n${t.ubicacion.direccion}, ${t.ubicacion.ciudad}, ${t.ubicacion.provincia}\n\n${t.ubicacion.referencias}\n\n${t.ubicacion.nota}\n\n👗 ${t.ubicacion.mapaUrl}\n\n${t.frases.despedida[1]} ${t.frases.emojisFavoritos[1]}`;
        break;
      case '4':
        const faqs = t.faqs.slice(0, 3).map(faq => `❓ *${faq.pregunta}*\n${faq.respuesta}`).join('\n\n');
        response = `❓ *Preguntas Frecuentes*\n\n${faqs}\n\n*¿Tu pregunta no está? Escribime al WhatsApp* ${t.redes.whatsapp}`;
        break;
      case '5':
        const envios = `👗 *Envíos*\n\n• Punta Alta: ${t.envios.metodos.local} - ${t.envios.costos.local} (${t.envios.tiempos.local})\n• Bahía Blanca: ${t.envios.metodos.bahia} - ${t.envios.costos.bahia} (${t.envios.tiempos.bahia})\n• Resto del país: ${t.envios.metodos.resto} (${t.envios.tiempos.resto})\n\n${t.envios.disponible ? '✅ Envíos disponibles' : '❌ No hay envíos disponibles'}`;
        response = envios;
        break;
      case '6':
        response = `👗 *Medios de Pago*\n\n${t.pagos.metodos.join(', ')}\n\n${t.pagos.nota}\n\nCuotas: ${t.pagos.cuotas.info}`;
        break;
      case '7':
        response = `👗 *Cambios y Devoluciones*\n\n• *Política*: ${t.cambios.politica}\n• *Condiciones*: ${t.cambios.condiciones.join(', ')}\n• *Notas de crédito*: ${t.cambios.notasDeCredito.disponible ? `Disponibles (${t.cambios.notasDeCredito.vencimiento})` : 'No disponibles'}\n• *Liquidación*: ${t.cambios.liquidacion.nota}\n\n${t.cambios.nota}`;
        break;
      case '8':
        this.addNotification(phone, 'Solicita atención personal', 'atencion');
        response = `👗 *Perfecto! Te paso con nuestro equipo*\n\nEscribile directamente al WhatsApp: ${t.redes.whatsapp}\n\nTe respondemos lo antes posible! ${t.frases.emojisFavoritos[0]}`;
        delete this.userStates[phone];
        break;
      default:
        const faqResponse = this.searchFAQ(text);
        if (faqResponse) {
          response = faqResponse;
        } else {
          const infoResponse = this.searchStoreInfo(text);
          if (infoResponse) {
            response = infoResponse;
          } else {
            this.addNotification(phone, `Mensaje no reconocido: "${text}"`, 'pregunta');
            response = `❓ No entiendo "${text}", pero puedo ayudarte con:\n\n${this.getMenu()}\n\nO escribí *8* si necesitás hablar directamente con alguien de la tienda`;
          }
        }
    }

    if (this.isTest) return { response };
    return await this.sendText(jid, response);
  }

  async handleCategorySelection(jid, phone, text, data) {
    const categories = data.categories || [];
    const choice = parseInt(text);

    if (isNaN(choice) || choice < 1 || choice > categories.length) {
      const errorMsg = `❌ Categoría no válida. Elegí un número del 1 al ${categories.length}:`;
      this.userStates[phone] = { state: 'esperando-categoria', data: { categories }, lastActivity: Date.now() };
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    const cat = categories[choice - 1];
    return await this.getProductsFromBackend(jid, phone, cat.id, cat);
  }

  async getProductsFromBackend(jid, phone, catId, cat, page = 0) {
    try {
      const res = await axios.get(`${API_URL}/products?category=${catId}`);
      const products = res.data || [];

      if (products.length > 0) {
        const availableProducts = products.filter(p => p.status === 'disponible' && p.stock > 0);

        const PRODUCTS_PER_PAGE = 9;
        const totalPages = Math.ceil(availableProducts.length / PRODUCTS_PER_PAGE);
        const startIdx = page * PRODUCTS_PER_PAGE;
        const pageProducts = availableProducts.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

        let productsText = '';
        pageProducts.forEach((p, idx) => {
          const cleanName = (p.name || 'Producto sin nombre').replace(/\s*\(copia\)\s*/gi, '').trim();
          const priceFormatted = (p.price || 0).toLocaleString();

          // Construir info de stock por talle
          let stockInfo = '';
          let totalStock = 0;
          if (p.sizeStock && p.sizeStock.length > 0) {
            const availableSizes = p.sizeStock.filter(s => s.stock > 0);
            if (availableSizes.length > 0) {
              totalStock = availableSizes.reduce((sum, s) => sum + s.stock, 0);
              stockInfo = availableSizes.map(s => `${s.size.toUpperCase()}:${s.stock}`).join(' | ');
            } else {
              stockInfo = 'AGOTADO';
            }
          } else {
            stockInfo = 'Sin stock configurado';
          }

          let statusBadge = '';
          if (p.status === 'reservado' && p.reserved_by) {
            statusBadge = ' 🔒';
          }

          productsText += `${startIdx + idx + 1}️⃣ *${cleanName}*${statusBadge}\n   💰 $${priceFormatted} | Stock: ${totalStock}\n   📏 Talles: ${stockInfo}\n\n`;
        });

        const pageInfo = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';
        const headerText = `${cat.icon} *${cat.name.toUpperCase()}*${pageInfo}`;

        this.userStates[phone] = {
          state: 'esperando-producto',
          data: {
            products: availableProducts,
            category: cat,
            currentPage: page,
            totalPages: totalPages,
            PRODUCTS_PER_PAGE: PRODUCTS_PER_PAGE
          },
          lastActivity: Date.now()
        };

        const footerText = `✏️ *Elegí el número* del producto que te guste`;

        const fullText = `${headerText}\n\n${productsText}${footerText}`;

        if (this.isTest) {
          return { 
            response: fullText,
            products: pageProducts
          };
        }
        return await this.sendText(jid, fullText);
      }
    } catch (e) {
      console.error('Error fetching products:', e.message);
    }

    const response = `${cat.icon} *CATEGORÍA: ${cat.name.toUpperCase()}*\n\nNo hay productos disponibles en este momento.`;
    this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
    
    return this.isTest ? { response } : await this.sendText(jid, response);
  }

  async handlePagination(jid, phone, direction, data) {
    const { products, category, currentPage = 0, totalPages = 1 } = data;
    
    let newPage = currentPage;
    if (direction === 'next' && currentPage < totalPages - 1) {
      newPage = currentPage + 1;
    } else if (direction === 'prev' && currentPage > 0) {
      newPage = currentPage - 1;
    } else {
      const msg = direction === 'next' 
        ? '⚠️ Ya estás en la última página' 
        : '⚠️ Ya estás en la primera página';
      return this.isTest ? { response: msg } : await this.sendText(jid, msg);
    }

    return await this.getProductsFromBackend(jid, phone, category.id, category, newPage);
  }

  getSizeInfo(sizesStr) {
    if (!sizesStr) {
      return { type: 'ropa', sizes: ['S', 'M', 'L', 'XL'], display: 'S, M, L, XL', emoji: '👗', pregunta: '¿Qué talle querés?' };
    }
    
    const sizes = sizesStr.split(',').map(s => s.trim().toUpperCase());
    const isCalzado = sizes.some(s => /^\d+$/.test(s));
    
    if (isCalzado) {
      return {
        type: 'calzado',
        sizes: sizes,
        display: sizes.join(', '),
        emoji: '👟',
        pregunta: '¿Qué número de calzado usás?'
      };
    }
    
    return {
      type: 'ropa',
      sizes: sizes,
      display: sizes.join(', '),
      emoji: '👗',
      pregunta: '¿Qué talle querés?'
    };
  }

  formatSizeStockWithCount(sizeStock, sizesStr) {
    const sizes = sizesStr ? sizesStr.split(',').map(s => s.trim().toUpperCase()) : ['S', 'M', 'L', 'XL'];
    const isCalzado = sizes.some(s => /^\d+$/.test(s));
    const emoji = isCalzado ? '👟' : '👗';
    
    let allSizesDisplay = [];
    let availableSizes = [];
    
    // Crear mapa de stock real
    const sizeStockMap = {};
    if (sizeStock && Array.isArray(sizeStock)) {
      sizeStock.forEach(s => {
        const key = (s.size || '').toUpperCase();
        sizeStockMap[key] = parseInt(s.stock) || 0;
      });
    }
    
    // Si no hay sizeStock, no mostrar ningún talle (el admin no configuró stock)
    if (Object.keys(sizeStockMap).length === 0) {
      return {
        emoji,
        availableSizes: [],
        display: '',
        fullDisplay: `📏 *Stock por talle:*\n   ⚠️ Talle no especificado`
      };
    }
    
    // Mostrar SOLO los talles que están en sizeStock (los que el admin configuró)
    Object.keys(sizeStockMap).forEach(size => {
      const stock = sizeStockMap[size];
      if (stock > 0) {
        allSizesDisplay.push(`   • ${size}: ${stock} ${stock === 1 ? 'unidad' : 'unidades'}`);
        availableSizes.push(size);
      } else {
        allSizesDisplay.push(`   ❌ ${size}: Agotado`);
      }
    });
    
    return {
      emoji,
      availableSizes,
      display: availableSizes.join(', '),
      fullDisplay: `📏 *Stock por talle:*\n${allSizesDisplay.join('\n')}`
    };
  }

  async handleProductSelection(jid, phone, text, data) {
    const { products, currentPage = 0, PRODUCTS_PER_PAGE = 9, category, totalPages } = data;

    if (text === 'prev') {
      if (currentPage > 0) {
        return await this.getProductsFromBackend(jid, phone, category.id, category, currentPage - 1);
      }
      return null;
    }

    if (text === 'next') {
      if (currentPage < totalPages - 1) {
        return await this.getProductsFromBackend(jid, phone, category.id, category, currentPage + 1);
      }
      return null;
    }

    let product;
    const productNum = parseInt(text);
    if (!isNaN(productNum) && productNum > 0) {
      const startIndex = currentPage * PRODUCTS_PER_PAGE;
      const productIndex = startIndex + (productNum - 1);
      product = products[productIndex];
    }

    if (!product) {
      const errorMsg = `❌ Escribí el *número* del producto que querés`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    // Verificar disponibilidad REAL en backend (estado actual)
    let currentProduct = product;
    try {
      const response = await axios.get(`${API_URL}/products/${product.id}`);
      currentProduct = response.data;

      if (currentProduct.status === 'vendido') {
        const unavailableMsg = `❌ *Este producto ya fue vendido*\n\n${currentProduct.name} ya no está disponible.\n\n¿Querés ver otros productos? Escribí *1* para volver al catálogo.`;
        return this.isTest ? { response: unavailableMsg } : await this.sendText(jid, unavailableMsg);
      }

      if (currentProduct.status === 'reservado') {
        const reservedBy = currentProduct.reserved_by || 'otro cliente';
        const unavailableMsg = `❌ *Este producto está reservado*\n\n${currentProduct.name} ya fue reservado por ${reservedBy}.\n\n¿Querés ver otros productos? Escribí *1* para volver al catálogo.`;
        return this.isTest ? { response: unavailableMsg } : await this.sendText(jid, unavailableMsg);
      }

      if (currentProduct.stock <= 0) {
        const unavailableMsg = `❌ *Ups! Este producto se terminó*\n\n${currentProduct.name} ya no tiene stock disponible.\n\n¿Querés ver otros productos? Escribí *1* para volver al catálogo.`;
        return this.isTest ? { response: unavailableMsg } : await this.sendText(jid, unavailableMsg);
      }
    } catch (error) {
      console.error('Error checking product status:', error.message);
    }

    // Actualizar con datos frescos del backend
    this.userStates[phone] = {
      state: 'esperando-nombre-y-talle',
      data: { ...data, selectedProduct: currentProduct },
      lastActivity: Date.now()
    };

    const sizeInfo = this.formatSizeStockWithCount(currentProduct.sizeStock, currentProduct.sizes);
    const productName = (currentProduct.name || 'Producto').replace(/\s*\(copia\)\s*/gi, '').trim();
    const productPrice = (currentProduct.price || 0).toLocaleString();
    
    if (sizeInfo.availableSizes.length === 0) {
      const noStockMsg = `❌ *Ups! Este producto no tiene stock disponible*\n\n${productName} se terminó.\n\n¿Querés ver otros productos? Escribí *1* para volver al catálogo.`;
      return this.isTest ? { response: noStockMsg } : await this.sendText(jid, noStockMsg);
    }
    
    const detailMsg = `✅ *SELECCIONASTE: ${productName.toUpperCase()}*\n\n💰 *Precio*: $${productPrice}\n📝 *Descripción*: ${currentProduct.description || 'Sin descripción'}\n\n📏 *DISPONIBILIDAD POR TALLE:*\n${sizeInfo.fullDisplay}\n\n📦 *Total en stock*: ${currentProduct.stock || 0} ${(currentProduct.stock || 0) === 1 ? 'unidad' : 'unidades'}\n\n📝 *RESERVAR:* Escribí tu nombre, talle y cantidad\nEjemplo: *María García - M*\nO: *María García - M x 2*`;

    if (product.image_url && !this.isTest) {
      await this.sendImage(jid, product.image_url, detailMsg);
      return null;
    }

    return this.isTest ? { response: detailMsg, selectedProduct: currentProduct } : await this.sendText(jid, detailMsg);
  }

  async handleExampleSelection(jid, phone, text, data) {
    const choice = parseInt(text);
    const examples = data.category?.ejemplos || [];

    if (isNaN(choice) || choice < 1 || choice > examples.length) {
      const errorMsg = '❌ Número no válido. Elegí un número de la lista:';
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    const selected = examples[choice - 1];

    this.userStates[phone] = {
      state: 'esperando-talle',
      data: {
        selectedProduct: {
          id: `ejemplo-${choice}`,
          name: selected.nombre,
          price: selected.precio,
          sizes: 'S,M,L,XL'
        }
      },
      lastActivity: Date.now()
    };

    const response = `✅ Seleccionaste: *${selected.nombre}* - $${selected.precio.toLocaleString()}\n\n📏 ¿Qué talle querés? (S, M, L, XL):`;
    return this.isTest ? { response } : await this.sendText(jid, response);
  }

  async handleSizeSelection(jid, phone, text, data) {
    const size = text.toUpperCase();
    const sizeInfo = this.getSizeInfo(data.selectedProduct?.sizes);
    const validSizes = sizeInfo.sizes;
    
    if (!validSizes.includes(size)) {
      const errorMsg = `❌ Talle/no no válido. Los talles disponibles son: ${sizeInfo.display}`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }
    
    // Verificar stock del talle en tiempo real desde backend
    try {
      const response = await axios.get(`${API_URL}/products/${data.selectedProduct.id}`);
      const product = response.data;
      
      // Actualizar con datos frescos
      data.selectedProduct = product;
      
      const sizeStockItem = product.sizeStock?.find(s => (s.size || '').toUpperCase() === size);
      const stock = sizeStockItem ? parseInt(sizeStockItem.stock) : 0;
      
      if (stock <= 0) {
        // Mostrar talles disponibles actualizados
        const availableSizes = product.sizeStock?.filter(s => s.stock > 0).map(s => s.size.toUpperCase()) || [];
        const errorMsg = `❌ El talle ${size} ya no tiene stock.\n\nTalles disponibles: ${availableSizes.join(', ') || 'Ninguno'}\n\n¿Querés elegir otro talle?`;
        return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
      }
    } catch (error) {
      console.error('Error verificando stock:', error.message);
    }

    this.userStates[phone] = {
      state: 'esperando-nombre',
      data: { ...data, size },
      lastActivity: Date.now()
    };

    const response = '✅ Perfecto. Ahora ingresa tu nombre completo:';
    return this.isTest ? { response } : await this.sendText(jid, response);
  }

  async handleNameInput(jid, phone, name, data) {
    const customerName = name && name.trim().length > 0 ? name.trim() : 'Cliente';
    const firstName = customerName.split(' ')[0] || 'Cliente';
    const productName = (data.selectedProduct?.name || 'Producto').replace(/\s*\(copia\)\s*/gi, '').trim();
    const productPrice = (data.selectedProduct?.price || 0).toLocaleString();
    
    try {
      const result = await createOrder(data.selectedProduct?.id, data.size, customerName, phone);

      let response;
      if (result && result.success === true) {
        const sizeInfo = this.getSizeInfo(data.selectedProduct?.sizes);
        response = `🎉 *¡RESERVA CONFIRMADA!*\n\nHola ${firstName}! Tu reserva está lista:\n\n📦 *Producto*: ${productName}\n${sizeInfo.emoji} *Talle*: ${data.size}\n💰 *Precio*: $${productPrice}\n\n📝 Te contactaremos pronto para confirmar y coordinar el pago.\n\n¡Gracias por elegirnos! ${tienda.frases.emojisFavoritos[0]}`;
        this.addNotification(phone, `Nueva reserva: ${productName} (Talle ${data.size}) - Cliente: ${customerName}`, 'reserva');
      } else if (result && result.success === false) {
        if (result.error === 'no_disponible') {
          const unavailableMsg = `❌ *Ups! Este producto ya no está disponible*\n\n${result.message || 'Alguien más lo reservó hace un momento.'}\n\n¿Querés ver otros productos? Escribí *1* para volver al catálogo.`;
          this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
          return this.isTest ? { response: unavailableMsg } : await this.sendText(jid, unavailableMsg);
        } else if (result.error === 'Error de conexión') {
          const connErrorMsg = `❌ * temporalmente fuera de servicio*\n\n${result.message}\n\nPor favor intentá en unos minutos o contactanos directamente por WhatsApp: ${tienda.redes.whatsapp}`;
          return this.isTest ? { response: connErrorMsg } : await this.sendText(jid, connErrorMsg);
        } else {
          response = `❌ ${result.message || 'Hubo un error al guardar el pedido. Por favor intentá nuevamente.'}`;
        }
      } else {
        response = '❌ Hubo un error al guardar el pedido. Por favor intentá nuevamente.';
      }

      delete this.userStates[phone];
      return this.isTest ? { response } : await this.sendText(jid, response);
    } catch (error) {
      console.error('Error in handleNameInput:', error.message);
      const errorMsg = `❌ Hubo un error al procesar tu reserva. Por favor intentá más tarde.\n\nSi el problema persiste, escribinos al WhatsApp: ${tienda.redes.whatsapp}`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }
  }

  async handleNameAndSizeInput(jid, phone, text, data) {
    const { selectedProduct } = data;
    
    if (!selectedProduct) {
      const errorMsg = `❌ Ocurrió un error. Escribí *menu* para empezar de nuevo.`;
      this.userStates[phone] = { state: 'menu-principal', data: {}, lastActivity: Date.now() };
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    // Buscar " - " como separador entre nombre y talle/cantidad
    let customerName = '';
    let size = '';
    let quantity = 1;
    
    // Patrones aceptados:
    // "María García - M x 2"
    // "María García - M (2)"
    // "María García - M 2"
    // "María García - M"
    let sizeAndQty = '';
    
    if (text.includes(' - ')) {
      const parts = text.split(' - ');
      customerName = parts[0].trim();
      sizeAndQty = parts[1].trim();
    } else if (text.includes('-')) {
      const parts = text.split('-');
      customerName = parts[0].trim();
      sizeAndQty = parts[1].trim();
    } else {
      const errorMsg = `❌ Formato incorrecto.\n\nEscribí: *Nombre - Talle*\nEjemplo: *María García - M*\nO con cantidad: *María García - M x 2*`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    if (!customerName || customerName.length < 2) {
      const errorMsg = `❌ Escribí tu nombre completo.\n\nEjemplo: *María García - M*`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    // Extraer talle y cantidad de "M x 2" o "M (2)" o "M 2"
    const sizeMatch = sizeAndQty.match(/^([a-zA-Z0-9]+)/i);
    if (sizeMatch) {
      size = sizeMatch[1].toUpperCase();
    }
    
    // Buscar cantidad (x 2, (2), 2)
    const qtyMatch = sizeAndQty.match(/(?:x\s*|[\(\[])\s*(\d+)\s*[\)\]]?|x\s*(\d+)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1] || qtyMatch[2]) || 1;
    }

    if (!size) {
      const errorMsg = `❌ Escribí el talle.\n\nEjemplo: *María García - M*`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    if (quantity < 1) quantity = 1;
    if (quantity > 10) quantity = 10; // Máximo 10 por pedido

    // Validar que el talle esté disponible
    const sizeInfo = this.getSizeInfo(selectedProduct?.sizes);
    if (!sizeInfo.sizes.includes(size)) {
      const errorMsg = `❌ Talle "${size}" no válido.\n\nTalles disponibles: ${sizeInfo.display}`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }

    // Verificar stock del talle en tiempo real
    try {
      const response = await axios.get(`${API_URL}/products/${selectedProduct.id}`);
      const product = response.data;
      
      const sizeStockItem = product.sizeStock?.find(s => (s.size || '').toUpperCase() === size);
      const stock = sizeStockItem ? parseInt(sizeStockItem.stock) : 0;
      
      if (stock < quantity) {
        const availableSizes = product.sizeStock?.filter(s => s.stock > 0).map(s => s.size.toUpperCase()) || [];
        const stockMsg = stock === 0 
          ? `❌ El talle ${size} ya no tiene stock.`
          : `❌ Solo hay ${stock} unidad${stock > 1 ? 'es' : ''} del talle ${size}.`;
        const errorMsg = `${stockMsg}\n\nTalles disponibles: ${availableSizes.join(', ') || 'Ninguno'}\n\nO escribí una cantidad menor:\nEjemplo: *${customerName} - ${size} x ${stock > 0 ? stock : 1}*`;
        return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
      }
    } catch (error) {
      console.error('Error verificando stock:', error.message);
    }

    // Proceder con la reserva
    const firstName = customerName.split(' ')[0];
    const productName = (selectedProduct?.name || 'Producto').replace(/\s*\(copia\)\s*/gi, '').trim();
    const productPrice = (selectedProduct?.price || 0).toLocaleString();
    const totalPrice = (selectedProduct?.price || 0) * quantity;

    try {
      const result = await createOrder(selectedProduct.id, size, customerName, phone, quantity);

      let response;
      if (result && result.success === true) {
        const qtyText = quantity > 1 ? ` x${quantity}` : '';
        response = `✅ *TU RESERVA ESTÁ LISTA*\n\n📦 *Producto*: ${productName}\n📏 *Talle*: ${size}${qtyText}\n💰 *Precio*: $${productPrice}${quantity > 1 ? ` (total: $${totalPrice.toLocaleString()})` : ''}\n\n📝 Te contactaremos pronto para confirmar y coordinar el pago.\n\n¡Gracias! ${tienda.frases.emojisFavoritos[0]}`;
        this.addNotification(phone, `Nueva reserva: ${productName} ${qtyText} Talle ${size} - Cliente: ${customerName}`, 'reserva');
      } else if (result && result.success === false) {
        if (result.error === 'no_disponible') {
          response = `❌ *Ups! No hay suficiente stock*\n\n${result.message || 'Alguien más reservó hace un momento.'}\n\n¿Querés elegir otra cantidad o talle?\nEjemplo: *${customerName} - L x 2*`;
          this.userStates[phone] = { 
            state: 'esperando-nombre-y-talle', 
            data: { ...data, selectedProduct: { ...selectedProduct } }, 
            lastActivity: Date.now() 
          };
          return this.isTest ? { response } : await this.sendText(jid, response);
        } else {
          response = `❌ ${result.message || 'Hubo un error al guardar el pedido. Intentá nuevamente.'}`;
        }
      } else {
        response = '❌ Hubo un error al guardar el pedido. Por favor intentá nuevamente.';
      }

      delete this.userStates[phone];
      // Estado post-reserva para no mostrar menú completo
      this.userStates[phone] = { 
        state: 'post-reserva', 
        data: { lastReservation: productName }, 
        lastActivity: Date.now() 
      };
      return this.isTest ? { response } : await this.sendText(jid, response);
    } catch (error) {
      console.error('Error in handleNameAndSizeInput:', error.message);
      const errorMsg = `❌ Hubo un error al procesar tu reserva. Por favor intentá más tarde.\n\nSi el problema persiste, escribinos al WhatsApp: ${tienda.redes.whatsapp}`;
      return this.isTest ? { response: errorMsg } : await this.sendText(jid, errorMsg);
    }
  }

  cleanupOldStates(maxAgeMs = 1000 * 60 * 30) {
    const now = Date.now();
    const phonesToDelete = [];
    
    for (const phone in this.userStates) {
      const state = this.userStates[phone];
      const lastActivity = state.lastActivity || 0;
      if (now - lastActivity > maxAgeMs) {
        phonesToDelete.push(phone);
      }
    }
    
    phonesToDelete.forEach(phone => delete this.userStates[phone]);
    
    if (phonesToDelete.length > 0) {
      console.log(`Limpiados ${phonesToDelete.length} estados antiguos`);
    }
    this.lastCleanup = now;
  }

  ensureCleanup() {
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.cleanupOldStates();
    }
  }

  resetStates() {
    for (let key in this.userStates) {
      delete this.userStates[key];
    }
  }

  searchFAQ(query) {
    const normalizedQuery = query.toLowerCase();
    const t = tienda;
    
    for (const faq of t.faqs) {
      const keywords = faq.pregunta.toLowerCase().split(' ');
      if (keywords.some(kw => kw.length > 3 && normalizedQuery.includes(kw))) {
        return `❓ *${faq.pregunta}*\n${faq.respuesta}`;
      }
    }
    return null;
  }

  searchStoreInfo(query) {
    const normalizedQuery = query.toLowerCase();
    const t = tienda;
    const responses = [];

    if (normalizedQuery.includes('ubicacion') || normalizedQuery.includes('direccion') || normalizedQuery.includes('donde') || normalizedQuery.includes('local')) {
      responses.push(`📍 *Ubicación*\n\n${t.ubicacion.direccion}, ${t.ubicacion.ciudad}, ${t.ubicacion.provincia}\n\n${t.ubicacion.referencias}\n\n${t.ubicacion.nota}\n\n📍 ${t.ubicacion.mapaUrl}`);
    }

    if (normalizedQuery.includes('horario') || normalizedQuery.includes('abren') || normalizedQuery.includes('hora') || normalizedQuery.includes('atienden')) {
      let horarios = `🕐 *Horarios de Atención*\n\n`;
      for (const [dia, hora] of Object.entries(t.horarios.atencion)) {
        horarios += `• ${dia.charAt(0).toUpperCase() + dia.slice(1)}: ${hora}\n`;
      }
      horarios += `\n${t.horarios.nota}`;
      responses.push(horarios);
    }

    if (normalizedQuery.includes('envio') || normalizedQuery.includes('envían') || normalizedQuery.includes('moto') || normalizedQuery.includes('entrega')) {
      responses.push(`📦 *Envíos*\n\n• Punta Alta: ${t.envios.metodos.local} - ${t.envios.costos.local} (${t.envios.tiempos.local})\n• Bahía Blanca: ${t.envios.metodos.bahia} - ${t.envios.costos.bahia} (${t.envios.tiempos.bahia})\n• Resto del país: ${t.envios.metodos.resto} (${t.envios.tiempos.resto})\n\n${t.envios.disponible ? '✅ Envíos disponibles' : '❌ No hay envíos disponibles'}`);
    }

    if (normalizedQuery.includes('pago') || normalizedQuery.includes('mercadopago') || normalizedQuery.includes('efectivo') || normalizedQuery.includes('tarjeta') || normalizedQuery.includes('transferencia') || normalizedQuery.includes('cuota')) {
      responses.push(`💳 *Medios de Pago*\n\n${t.pagos.metodos.join(', ')}\n\n${t.pagos.nota}\n\nCuotas: ${t.pagos.cuotas.info}`);
    }

    if (normalizedQuery.includes('cambio') || normalizedQuery.includes('devolucion') || normalizedQuery.includes('devolver')) {
      responses.push(`🔄 *Cambios y Devoluciones*\n\n• Política: ${t.cambios.politica}\n• Condiciones: ${t.cambios.condiciones.join(', ')}\n• Notas de crédito: ${t.cambios.notasDeCredito.disponible ? `Disponibles (${t.cambios.notasDeCredito.vencimiento})` : 'No disponibles'}\n• Liquidación: ${t.cambios.liquidacion.nota}\n\n${t.cambios.nota}`);
    }

    if (normalizedQuery.includes('instagram') || normalizedQuery.includes('redes') || normalizedQuery.includes('ig') || normalizedQuery.includes('facebook')) {
      responses.push(`📱 *Nuestras Redes*\n\n• Instagram: ${t.redes.instagram}\n• WhatsApp: ${t.redes.whatsapp}`);
    }

    if (normalizedQuery.includes('whatsapp') || normalizedQuery.includes('wpp') || normalizedQuery.includes('contacto') || normalizedQuery.includes('escribir')) {
      responses.push(`📱 *Contacto*\n\nEscribinos al WhatsApp: ${t.redes.whatsapp}\n\no por Instagram: ${t.redes.instagram}`);
    }

    if (responses.length > 0) {
      return responses.join('\n\n') + `\n\n${t.frases.despedida[1]} ${t.frases.emojisFavoritos[1]}`;
    }
    return null;
  }
}

module.exports = MessageProcessor;
