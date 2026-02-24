// Mensajes proactivos para la burbuja junto al botón del chat.
// Se muestran tras unos segundos para incentivar la interacción.
//
// Cada entrada devuelve { bubble, userMessage }:
//   - bubble: texto que se muestra en la burbuja (lo que "dice" el bot)
//   - userMessage: texto que se envía como mensaje del usuario al hacer clic

function formatPrice(price) {
  if (!price && price !== 0) return null;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

/** Helper: nombre corto del coche ("BMW Serie 3") o fallback genérico */
function carName(c, fallback = 'este coche') {
  return c ? `${c.make} ${c.model}` : fallback;
}

// FICHA DE COCHE — El visitante ya muestra interés en un vehículo concreto.
// Objetivo: resolver la última duda y empujar a la acción (contacto, prueba, financiación).
const CAR_PAGE_MESSAGES = [
  // Financiación / cuota
  (c) => ({
    bubble: `¿Quieres saber la cuota mensual de este ${carName(c)}?`,
    userMessage: `¿Cuál es la cuota mensual del ${carName(c)}?`,
  }),
  (c) => ({
    bubble: `¿Te calculo la financiación de este ${carName(c)}?`,
    userMessage: `Calcula la financiación del ${carName(c)}.`,
  }),
  (c) => ({
    bubble: c?.price
      ? `El ${carName(c)} por ${formatPrice(c.price)}. ¿Te calculo la cuota?`
      : '¿Necesitas info sobre financiación para este coche?',
    userMessage: `Calcula la cuota de financiación del ${carName(c)}.`,
  }),
  // Prueba de conducción
  (c) => ({
    bubble: `¿Te gustaría probar el ${carName(c)}? Agendamos una prueba de conducción.`,
    userMessage: `Quiero agendar una prueba de conducción del ${carName(c)}.`,
  }),
  (c) => ({
    bubble: `¿Quieres probar el ${carName(c)}? Podemos agendar una prueba de conducción.`,
    userMessage: `Me gustaría probar el ${carName(c)}.`,
  }),
  // Urgencia / escasez
  (c) => ({
    bubble: `El ${carName(c)} es uno de los más consultados. ¿Te interesa?`,
    userMessage: `Cuéntame más sobre el ${carName(c)}.`,
  }),
  (c) => ({
    bubble: `Este ${carName(c)} lleva poco tiempo en stock. ¿Quieres más info?`,
    userMessage: `Dame más información sobre el ${carName(c)}.`,
  }),
  // Confianza / garantía
  (c) => ({
    bubble: `El ${carName(c)} incluye garantía. ¿Te cuento las condiciones?`,
    userMessage: `¿Qué garantía tiene el ${carName(c)}?`,
  }),
  (c) => ({
    bubble: c?.mileage
      ? `Este ${carName(c)} tiene ${c.mileage} certificados. ¿Te cuento más?`
      : 'Este coche tiene km certificados. ¿Te cuento más?',
    userMessage: `Cuéntame más sobre el ${carName(c)}.`,
  }),
  // Equipamiento / detalles
  (c) => ({
    bubble: `¿Quieres saber el equipamiento completo de este ${carName(c)}?`,
    userMessage: `¿Qué equipamiento tiene el ${carName(c)}?`,
  }),
  (c) => ({
    bubble: `¿Quieres comparar el ${carName(c)} con otros similares?`,
    userMessage: `Compara el ${carName(c)} con otros coches similares.`,
  }),
  // Entrega
  (c) => ({
    bubble: `Entregamos en toda España. ¿Te interesa el ${carName(c)}?`,
    userMessage: `Cuéntame más sobre el ${carName(c)}.`,
  }),
];

// LISTADO / STOCK — El visitante está explorando opciones.
// Objetivo: que inicie conversación para cualificar y guiarle al coche ideal.
const STOCK_PAGE_MESSAGES = [
  // Cualificación por presupuesto
  { bubble: 'Dime tu presupuesto y te propongo las mejores opciones.', userMessage: 'Quiero que me propongas opciones según mi presupuesto.' },
  { bubble: '¿Cuánto quieres pagar al mes? Te busco opciones que encajen.', userMessage: 'Quiero ver opciones según lo que pueda pagar al mes.' },
  // Cualificación por uso
  { bubble: '¿Quieres que te recomiende opciones según tu uso diario?', userMessage: 'Recomiéndame opciones según mi uso diario.' },
  { bubble: 'Dime qué tipo de coche necesitas y te hago una selección.', userMessage: 'Necesito ayuda para elegir qué tipo de coche me conviene.' },
  { bubble: '¿Buscas automático, diésel, híbrido? Cuéntame.', userMessage: 'Quiero ver qué opciones tenéis en stock.' },
  // Búsqueda asistida
  { bubble: '¿Buscas algo concreto? Te ayudo a encontrarlo.', userMessage: 'Estoy buscando un coche concreto.' },
  { bubble: '¿Necesitas un coche con etiqueta ECO o CERO?', userMessage: 'Busco un coche con etiqueta ECO o CERO.' },
  // Coches a la carta
  { bubble: '¿No encuentras lo que buscas? Podemos pedirlo a la carta.', userMessage: 'Quiero pedir un coche a la carta.' },
  { bubble: 'Si no ves lo que buscas, te lo conseguimos a la carta.', userMessage: 'Quiero pedir un coche a la carta.' },
  // Prueba de conducción
  { bubble: '¿Te gustaría probar alguno? Agendamos una prueba de conducción sin compromiso.', userMessage: 'Quiero agendar una prueba de conducción.' },
  // Novedades
  { bubble: 'Tenemos novedades cada semana. ¿Te cuento lo último?', userMessage: '¿Qué novedades tenéis esta semana?' },
];

// HOME / LANDING — Primer contacto, puede que aún no sepa qué quiere.
// Objetivo: generar confianza, mostrar valor diferencial y abrir conversación.
const HOME_MESSAGES = [
  // Entrada fácil
  { bubble: '¿Estás buscando coche? Te ayudo a encontrarlo.', userMessage: 'Estoy buscando coche.' },
  { bubble: '¿Quieres ver qué coches tenemos disponibles?', userMessage: '¿Qué coches tenéis disponibles?' },
  { bubble: 'Dime qué buscas y te propongo opciones al momento.', userMessage: 'Quiero ver opciones de coches.' },
  // Presupuesto
  { bubble: '¿Buscas coche? Dime tu presupuesto y te propongo opciones.', userMessage: 'Quiero que me propongas opciones según mi presupuesto.' },
  { bubble: '¿Sabes que puedes financiar con cuotas a tu medida? Te cuento.', userMessage: 'Quiero saber sobre opciones de financiación.' },
  // Diferenciadores
  { bubble: 'Todos nuestros coches tienen km certificados y garantía.', userMessage: 'Contadme más sobre vuestros coches y garantías.' },
  { bubble: 'Entregamos en toda España. ¿Buscas algo en concreto?', userMessage: 'Estoy buscando coche, ¿hacéis entregas en toda España?' },
  { bubble: 'Más de 30 años vendiendo coches en Madrid. ¿Te ayudo?', userMessage: 'Quiero que me ayudéis a encontrar coche.' },
  // Coche a la carta
  { bubble: '¿Sabes que podemos conseguirte un coche a la carta?', userMessage: 'Quiero pedir un coche a la carta.' },
  { bubble: '¿No encuentras lo que buscas? Te lo conseguimos.', userMessage: 'Busco un coche que no encuentro, ¿podéis conseguirlo?' },
  // Asesoramiento
  { bubble: '¿Necesitas ayuda para elegir? Te asesoro sin compromiso.', userMessage: 'Necesito asesoramiento para elegir un coche.' },
  // Acción directa
  { bubble: '¿Quieres agendar una visita o prueba de conducción?', userMessage: 'Quiero agendar una visita o prueba de conducción.' },
];

// FOLLOW-UP — Segunda burbuja (~45s después). Último empujón.
// Objetivo: eliminar fricción. Si no ha escrito, es por pereza o desconfianza. Atacar ambas.
const FOLLOW_UP_MESSAGES = [
  // Baja fricción
  { bubble: 'Solo te lleva 1 minuto. Pregúntame lo que necesites.', userMessage: 'Hola, tengo una consulta.' },
  { bubble: 'Te respondo en segundos, sin compromiso.', userMessage: 'Hola, tengo una pregunta.' },
  { bubble: 'Respondo al momento, sin esperas.', userMessage: 'Hola, necesito ayuda.' },
  // Sin compromiso
  { bubble: 'Sin compromiso, solo respondo tus dudas.', userMessage: 'Hola, tengo una duda.' },
  { bubble: 'Sin presión. Solo quiero ayudarte a elegir bien.', userMessage: 'Hola, necesito ayuda para elegir coche.' },
  // Valor concreto
  { bubble: 'Pregúntame precio, cuota, equipamiento... lo que quieras.', userMessage: 'Quiero información sobre vuestros coches.' },
  { bubble: 'Puedo buscarte coches, calcular cuotas o agendar una visita.', userMessage: 'Quiero que me ayudéis a buscar coche.' },
  // Prueba social
  { bubble: 'Cientos de clientes ya han comprado con nuestra ayuda.', userMessage: 'Hola, estoy interesado en comprar un coche.' },
];

/**
 * Devuelve un mensaje aleatorio según el tipo de página.
 * @param {'car' | 'stock' | 'home'} pageType
 * @param {'initial' | 'followup'} phase
 * @param {object|null} carData - Datos del coche (solo para pageType 'car')
 * @returns {{ bubble: string, userMessage: string }}
 */
export function getRandomBubbleMessage(pageType, phase = 'initial', carData = null) {
  if (phase === 'followup') {
    return FOLLOW_UP_MESSAGES[Math.floor(Math.random() * FOLLOW_UP_MESSAGES.length)];
  }

  const pools = {
    car: CAR_PAGE_MESSAGES,
    stock: STOCK_PAGE_MESSAGES,
    home: HOME_MESSAGES,
  };

  const pool = pools[pageType] || HOME_MESSAGES;
  const entry = pool[Math.floor(Math.random() * pool.length)];

  // CAR_PAGE entries are functions that return { bubble, userMessage }
  return typeof entry === 'function' ? entry(carData) : entry;
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
