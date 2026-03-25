module.exports = {
  nombre: "BotWsp Store",
  slogan: "",
  descripcion: "Tienda de ropa moderna con las mejores tendencias del momento.",

  dueña: {
    nombre: "María García",
    apodo: "Mari",
    presentacion: "Mari, la dueña",
    instagram: "@botwspstore",
    whatsapp: "+54 9 11 5555-5555"
  },

  ubicacion: {
    direccion: "Av. Rivadavia 1234",
    ciudad: "Capital Federal",
    provincia: "Buenos Aires",
    referencias: "A dos cuadras de la estación de tren, local con vidriera moderna",
    mapaUrl: "https://maps.google.com/?q=Av+Rivadavia+1234+Capital+Federal",
    tipo: "local",
    nota: "Consultá disponibilidad antes de pasar."
  },

  horarios: {
    atencion: {
      lunes: "10:00 - 19:00",
      martes: "10:00 - 19:00",
      miércoles: "10:00 - 19:00",
      jueves: "10:00 - 19:00",
      viernes: "10:00 - 20:00",
      sábado: "10:00 - 20:00",
      domingo: "Cerrado"
    },
    nota: "Los horarios pueden variar en días festivos.",
    siempreActivo: false
  },

  categorias: {
    mujer: {
      id: "mujer",
      nombre: "Mujer",
      icono: "👗",
      descripcion: "Todo lo que busques en indumentaria femenina",
      categoriasCompletas: [
        "Remeras", "Remerones", "Tops",
        "Pantalones largos", "Pantalones cortos", "Shorts",
        "Polleras",
        "Vestidos",
        "Abrigos", "Camperas", "Buzos",
        "Ropa interior", "Medias",
        "Accesorios",
        "Jeans"
      ],
      destacados: [
        "Jeans (mucha variedad)",
        "Remeras de diseñadores locales",
        "Camperas de jean",
        "Vestidos"
      ],
      ejemplos: [
        { nombre: "Remera basic algodón", precio: 15000 },
        { nombre: "Remera oversize", precio: 18000 },
        { nombre: "Jean wide leg", precio: 35000 },
        { nombre: "Jean skinny elastizado", precio: 32000 },
        { nombre: "Buzo fleece", precio: 38000 },
        { nombre: "Vestido veraniego", precio: 42000 },
        { nombre: "Top básico", precio: 12000 },
        { nombre: "Pollera midi", precio: 22000 }
      ],
      rangosPrecio: {
        remeras: "$10.000 - $22.000",
        tops: "$8.000 - $18.000",
        pantalones: "$22.000 - $38.000",
        jeans: "$28.000 - $42.000",
        vestidos: "$28.000 - $48.000",
        camperas: "$40.000 - $75.000",
        buzos: "$32.000 - $55.000",
        accesorios: "$4.000 - $18.000",
        ropaInterior: "$3.000 - $10.000"
      },
      talles: "XS al XXL",
      nota: "Hacemos encargos si querés algo especial."
    },
    hombre: {
      id: "hombre",
      nombre: "Hombre",
      icono: "👔",
      descripcion: "Ropa moderna para hombres",
      destacados: ["Remeras oversize", "Buzos", "Pantalones cargo"],
      ejemplos: [
        { nombre: "Remera básica algodón", precio: 18000 },
        { nombre: "Remera oversize", precio: 22000 },
        { nombre: "Buzo friza", precio: 38000 },
        { nombre: "Buzo oversize", precio: 42000 },
        { nombre: "Jean clásico", precio: 35000 },
        { nombre: "Pantalón cargo", precio: 32000 }
      ],
      rangosPrecio: {
        remeras: "$12.000 - $25.000",
        buzos: "$32.000 - $52.000",
        jeans: "$28.000 - $42.000"
      },
      talles: "S al XXL (consultar disponibilidad)",
      nota: "Consultá disponibilidad."
    },
    ninos: {
      id: "ninos",
      nombre: "Niños/as",
      icono: "🧒",
      descripcion: "Ropa de niño/a en varios talles",
      destacados: ["Jeans talle 10-12", "Remeras talle S", "Buzos talle S"],
      ejemplos: [
        { nombre: "Remera basic niño", precio: 10000 },
        { nombre: "Jean moderno", precio: 16000 },
        { nombre: "Jean elastizado", precio: 14000 },
        { nombre: "Buzo friza", precio: 20000 },
        { nombre: "Buzo con capucha", precio: 22000 },
        { nombre: "Short jean", precio: 12000 },
        { nombre: "Pollera plisada", precio: 13000 }
      ],
      rangosPrecio: {
        remeras: "$7.000 - $13.000",
        jeans: "$10.000 - $20.000",
        buzos: "$15.000 - $28.000"
      },
      talles: "2, 4, 6, 8, 10, 12, 14, 16",
      nota: "Si le entra la ropa de adulto, le sirve."
    }
  },

  pagos: {
    metodos: ["Efectivo", "Transferencia bancaria", "Mercado Pago QR", "Tarjeta de débito", "Tarjeta de crédito"],
    descuentoEfectivo: 0,
    cuotas: {
      disponibles: true,
      info: "Las cuotas se generan automáticamente al pagar con QR de Mercado Pago o con el postnet",
      sinInteres: []
    },
    nota: "El recargo de tarjeta lo aplica Mercado Pago automáticamente."
  },

  envios: {
    disponible: true,
    cobertura: "CABA, GBA y resto del país",
    metodos: {
      local: "Moto",
      bahia: "Cadete",
      resto: "Correo Argentino"
    },
    tiempos: {
      local: "En el momento",
      bahia: "24-48 horas",
      resto: "3 a 7 días hábiles"
    },
    costos: {
      local: "$2.500",
      bahia: "$3.000 - $5.000",
      resto: "Según peso y destino"
    }
  },

  cambios: {
    politica: "Cambios dentro de los 7 días",
    plazo: "7 días",
    condiciones: ["Etiqueta puesta", "Sin uso", "Con ticket de cambio"],
    notasDeCredito: {
      disponible: true,
      vencimiento: "Sin vencimiento"
    },
    liquidacion: {
      cambios: false,
      nota: "Las prendas de sale y liquidación no tienen cambio"
    },
    nota: "No devolución de dinero (salvo prenda fallada)."
  },

  promociones: [
    { titulo: "Ofertas de temporada", vigencia: "Temporada actual", condicion: "Prendas seleccionadas" },
    { titulo: "Descuentos especiales", vigencia: "Sorpresa", condicion: "Seguinos en IG" }
  ],

  faqs: [
    { pregunta: "¿Cómo es el talle? ¿Anda bien?", respuesta: "Depende la marca, pero en general podríamos decir que la mayoría anda bien. Si tenés dudas pasate a probar o pedí dos talles y devolvé el que no te sirve." },
    { pregunta: "¿Qué talles hay disponibles?", respuesta: "Tenemos talles desde XS hasta XXL. Consultame disponibilidad específica del producto que te interesa." },
    { pregunta: "¿Los talles son reales o tallas grandes/chicas?", respuesta: "Cada marca es diferente. Si tenés dudas, consultame el talle específico." },
    { pregunta: "¿Tenés este producto en otro color?", respuesta: "Consultame y te informo disponibilidad." },
    { pregunta: "¿Hacés envíos?", respuesta: "Sí, a CABA en moto, a GBA por cadete y al interior por correo." },
    { pregunta: "¿Cuánto tarda en llegar?", respuesta: "A CABA en el momento, a GBA 24-48hs, al interior 3-7 días hábiles." },
    { pregunta: "¿Aceptás Mercado Pago?", respuesta: "Sí, acepto Mercado Pago QR, débito y crédito." },
    { pregunta: "¿Se puede cambiar?", respuesta: "Sí, hasta 7 días después de la compra, con etiqueta y sin uso." },
    { pregunta: "¿Hay nota de crédito?", respuesta: "Sí, emitimos nota de crédito sin vencimiento." },
    { pregunta: "¿Tenés local o solo online?", respuesta: "Tengo local, consultame por WA para coordinar." },
    { pregunta: "¿Cómo puedo comprar?", respuesta: "Me decís qué te gusta, te paso disponibilidad, y coordinamos pago y envío o retiro." },
    { pregunta: "¿Cuándo traés nuevo stock?", respuesta: "Traigo cosas nuevas cada semana, lo voy subiendo a IG." },
    { pregunta: "¿Hacés envíos al exterior?", respuesta: "Consultame y te paso el costo según el país." }
  ],

  frases: {
    saludo: [
      "Holii ¿cómo andás?",
      "Hola ¿todo bien?",
      "¡Hola! Bienvenido/a a BotWsp Store",
      "¡Buen día! ¿Cómo te va?"
    ],
    despedida: [
      "¡Chau! Cualquier cosa me escribís",
      "Te espero",
      "¡Nos vemos! Que tengas un lindo día",
      "Saludos, cualquier cosa me escribís"
    ],
    fraseTipica: "Respondemos rápido, no te quedes con dudas",
    emojisFavoritos: ["✨", "💫"]
  },

  redes: {
    instagram: "@botwspstore",
    facebook: "@botwspstore",
    whatsapp: "+54 9 11 5555-5555"
  },

  diferenciales: [
    "Últimas tendencias en moda",
    "Precios competitivos",
    "Atención personalizada",
    "Envíos rápidos",
    "Cambios y devoluciones fáciles"
  ]
};
