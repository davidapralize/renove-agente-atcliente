// Mensajes proactivos para la burbuja junto al botón del chat.
// Se muestran tras unos segundos para incentivar la interacción.

// FICHA DE COCHE — El visitante ya muestra interés en un vehículo concreto.
// Objetivo: resolver la última duda y empujar a la acción (contacto, prueba, financiación).
const CAR_PAGE_MESSAGES = [
  // Financiación / cuota — reduce la barrera del precio
  '¿Quieres saber la cuota mensual de este coche?',
  '¿Quieres que te calcule la cuota de este vehículo?',
  '¿Necesitas info sobre financiación para este coche?',
  // Prueba de conducción — compromiso clave
  '¿Te gustaría agendar una prueba de conducción?',
  '¿Quieres probarlo? Podemos agendar una cita.',
  // Urgencia / escasez — evita que posponga la decisión
  'Es uno de los más consultados esta semana. ¿Te interesa?',
  'Este vehículo lleva poco tiempo en stock. ¿Quieres más info?',
  // Confianza / garantía — seguridad en compras >=20k€
  'Este vehículo incluye garantía. ¿Te cuento las condiciones?',
  'Este coche tiene km certificados. ¿Te cuento más?',
  // Equipamiento / detalles — resolver dudas técnicas
  '¿Quieres saber el equipamiento completo?',
  '¿Quieres comparar este coche con otros similares?',
  // Entrega — elimina barrera geográfica
  'Entregamos en toda España. ¿Te interesa este vehículo?',
];

// LISTADO / STOCK — El visitante está explorando opciones.
// Objetivo: que inicie conversación para cualificar y guiarle al coche ideal.
const STOCK_PAGE_MESSAGES = [
  // Cualificación por presupuesto — abre la conversación con datos útiles
  'Dime tu presupuesto y te propongo las mejores opciones.',
  '¿Cuánto quieres pagar al mes? Te busco opciones que encajen.',
  // Cualificación por uso — personaliza y genera confianza
  '¿Quieres que te recomiende opciones según tu uso diario?',
  'Dime qué tipo de coche necesitas y te hago una selección.',
  '¿Buscas automático, diésel, híbrido? Cuéntame.',
  // Búsqueda asistida — reduce fatiga de decisión
  '¿Buscas algo concreto? Te ayudo a encontrarlo.',
  '¿Necesitas un coche con etiqueta ECO o CERO?',
  // Coches a la carta — retiene al que no encuentra lo que busca
  '¿No encuentras lo que buscas? Podemos pedirlo a la carta.',
  'Si no ves lo que buscas, te lo conseguimos a la carta.',
  // Prueba de conducción — empuja a la acción
  '¿Te gustaría probar alguno? Agendamos una prueba de conducción sin compromiso.',
  // Novedades — crea motivo para volver
  'Tenemos novedades cada semana. ¿Te cuento lo último?',
];

// HOME / LANDING — Primer contacto, puede que aún no sepa qué quiere.
// Objetivo: generar confianza, mostrar valor diferencial y abrir conversación.
const HOME_MESSAGES = [
  // Entrada fácil — baja la barrera para escribir
  '¿Estás buscando coche? Te ayudo a encontrarlo.',
  '¿Quieres ver qué coches tenemos disponibles?',
  'Dime qué buscas y te propongo opciones al momento.',
  // Presupuesto — cualifica rápido
  '¿Buscas coche? Dime tu presupuesto y te propongo opciones.',
  '¿Sabes que puedes financiar con cuotas a tu medida? Te cuento.',
  // Diferenciadores — por qué Renove y no otro
  'Todos nuestros coches tienen km certificados y garantía.',
  'Entregamos en toda España. ¿Buscas algo en concreto?',
  'Más de 30 años vendiendo coches en Madrid. ¿Te ayudo?',
  // Coche a la carta — diferenciador fuerte
  '¿Sabes que podemos conseguirte un coche a la carta?',
  '¿No encuentras lo que buscas? Te lo conseguimos.',
  // Asesoramiento — posiciona como experto, no como buscador
  '¿Necesitas ayuda para elegir? Te asesoro sin compromiso.',
  // Acción directa
  '¿Quieres agendar una visita o prueba de conducción?',
];

// FOLLOW-UP — Segunda burbuja (~45s después). Último empujón.
// Objetivo: eliminar fricción. Si no ha escrito, es por pereza o desconfianza. Atacar ambas.
const FOLLOW_UP_MESSAGES = [
  // Baja fricción — "es fácil y rápido"
  'Solo te lleva 1 minuto. Pregúntame lo que necesites.',
  'Te respondo en segundos, sin compromiso.',
  'Respondo al momento, sin esperas.',
  // Sin compromiso — elimina miedo a presión comercial
  'Sin compromiso, solo respondo tus dudas.',
  'Sin presión. Solo quiero ayudarte a elegir bien.',
  // Valor concreto — da un motivo para escribir
  'Pregúntame precio, cuota, equipamiento... lo que quieras.',
  'Puedo buscarte coches, calcular cuotas o agendar una visita.',
  // Prueba social
  'Cientos de clientes ya han comprado con nuestra ayuda.',
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
