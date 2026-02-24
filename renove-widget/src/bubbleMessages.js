// Mensajes proactivos para la burbuja junto al botón del chat.
// Se muestran tras unos segundos para incentivar la interacción.

const CAR_PAGE_MESSAGES = [
  '¿Quieres saber la cuota mensual de este coche?',
  '¿Tienes dudas sobre este vehículo? Te ayudo.',
  '¿Te gustaría agendar una prueba de conducción?',
  'Puedo darte más detalles de este coche.',
  '¿Quieres saber el equipamiento completo?',
  '¿Necesitas info sobre financiación para este coche?',
  '¿Quieres que te calcule la cuota de este vehículo?',
  'Este coche tiene km certificados. ¿Te cuento más?',
];

const STOCK_PAGE_MESSAGES = [
  '¿Buscas algo concreto? Te ayudo a encontrarlo.',
  'Dime tu presupuesto y te propongo opciones.',
  '¿No encuentras lo que buscas? Yo te ayudo.',
  'Puedo filtrar coches por lo que necesites.',
  '¿Necesitas un coche con etiqueta ECO o CERO?',
  'Dime qué tipo de coche necesitas y te hago una selección.',
  '¿Buscas automático, diésel, híbrido? Cuéntame.',
  '¿Quieres que te busque las mejores opciones en stock?',
];

const HOME_MESSAGES = [
  '¿Estás buscando coche? Te ayudo a encontrarlo.',
  '¿En qué puedo ayudarte hoy?',
  '¿Quieres ver qué coches tenemos disponibles?',
  'Tenemos más de 30 años de experiencia. ¿Te ayudo?',
  '¿Buscas coche? Dime tu presupuesto y te propongo opciones.',
  '¿Necesitas asesoramiento para elegir tu coche?',
  'Puedo ayudarte a encontrar tu coche ideal.',
  '¿Tienes alguna duda? Estoy aquí para ayudarte.',
];

// Segunda burbuja (más directa, para ~45s después si no ha interactuado)
const FOLLOW_UP_MESSAGES = [
  'Sin compromiso, solo respondo tus dudas.',
  'Pregúntame lo que quieras sobre nuestros coches.',
  'Estoy disponible si necesitas algo.',
  'Miles de clientes ya nos han consultado.',
  'Respondo al momento, sin esperas.',
];

/**
 * Devuelve un mensaje aleatorio según el tipo de página.
 * @param {'car' | 'stock' | 'home'} pageType
 * @param {'initial' | 'followup'} phase
 */
export function getRandomBubbleMessage(pageType, phase = 'initial') {
  if (phase === 'followup') {
    return FOLLOW_UP_MESSAGES[Math.floor(Math.random() * FOLLOW_UP_MESSAGES.length)];
  }

  const pools = {
    car: CAR_PAGE_MESSAGES,
    stock: STOCK_PAGE_MESSAGES,
    home: HOME_MESSAGES,
  };

  const pool = pools[pageType] || HOME_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Detecta el tipo de página según la URL.
 * Devuelve 'car' si es una ficha de coche, 'stock' si es listado, 'home' si no.
 */
export function detectPageType(url) {
  if (!url) return 'home';
  const lower = url.toLowerCase();

  // Ficha de coche individual (patrones comunes en webs de concesionarios)
  if (
    /\/coches?\/[^/]+\/[^/]+/i.test(lower) || // /coche/marca/modelo o /coches/marca/modelo
    /\/vehiculo/i.test(lower) ||
    /\/ficha/i.test(lower) ||
    /\/detalle/i.test(lower) ||
    /car_id=/i.test(lower) ||
    /vehicle_id=/i.test(lower)
  ) {
    return 'car';
  }

  // Listado / stock
  if (
    /\/stock/i.test(lower) ||
    /\/coches\/?$/i.test(lower) ||
    /\/vehiculos/i.test(lower) ||
    /\/ocasion/i.test(lower) ||
    /\/seminuevos/i.test(lower) ||
    /\/catalogo/i.test(lower)
  ) {
    return 'stock';
  }

  return 'home';
}
