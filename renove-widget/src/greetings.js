const GENERAL_GREETINGS = [
  `Hola, soy el asistente de ventas de Renove, concesionario en Madrid con más de 30 años de experiencia.

Puedo ayudarte a:

- Buscar coches en nuestro stock según lo que necesites (presupuesto, año, km, combustible, etiqueta, tipo de coche...)
- Darte información detallada de cada vehículo
- Reservar una prueba de conducción
- Calcular opciones orientativas de financiación
- Si no tenemos lo que buscas, tramitar una búsqueda a medida

Cuéntame, ¿qué tipo de coche estás buscando?`,

  `Hola, soy el asistente de ventas de Renove (concesionario en Madrid, en C. del Corazón de María, 23, Chamartín). Te ayudo a encontrar y comprar tu coche con total transparencia: vehículos revisados, km certificados y listos para entrega.

Puedo:

- Buscar en nuestro stock según tus preferencias
- Darte detalles de equipamiento, estado y disponibilidad
- Agendar una prueba de conducción (L\u2013V: 10:00\u201314:30 y 17:00\u201320:30, Sáb: 10:00\u201313:00)
- Calcular financiación orientativa
- Tramitar búsqueda personalizada si no tenemos lo que necesitas

¿Qué tipo de coche tienes en mente o cuál es tu presupuesto?`,

  `Hola, soy el asistente de ventas de Renove (concesionario en Madrid con más de 30 años de experiencia). Estamos en C. del Corazón de María, 23 (Chamartín), 28002 Madrid.

Puedo ayudarte con todo lo relacionado con la compra de coche en Renove:

- Encontrar tu coche ideal buscando en nuestro stock (según presupuesto, año, km, combustible, tipo de carrocería...)
- Darte información detallada de los vehículos: características, estado, precio y disponibilidad
- Reservar una prueba de conducción en nuestro concesionario
- Explicarte opciones de financiación orientativas
- Si no tenemos lo que buscas, tramitar una búsqueda personalizada

Horario: L\u2013V 10:00\u201314:30 y 17:00\u201320:30; Sáb 10:00\u201313:00; Dom cerrado.

Si me dices qué tipo de coche buscas (o tu presupuesto y uso), te propongo opciones concretas.`,

  `Hola, soy el asistente de ventas de Renove. Llevamos más de 30 años en el sector del automóvil en Madrid y todos nuestros vehículos están revisados, con kilómetros certificados y listos para entrega.

Esto es lo que puedo hacer por ti:

- Buscar coches en nuestro stock según lo que necesites (presupuesto, año, km, combustible, etiqueta, tipo de coche...)
- Darte detalles de cada vehículo: equipamiento, características, disponibilidad
- Reservar una prueba de conducción en nuestro horario
- Calcular opciones orientativas de financiación (las condiciones finales se confirman en el concesionario)
- Si no tenemos lo que buscas, puedo tramitar una búsqueda a medida

Si me dices qué tipo de coche buscas (presupuesto, uso, combustible...), te saco opciones de nuestro stock.`,

  `Hola, soy el asistente de ventas de Renove. Te ayudo a encontrar tu próximo coche en nuestro concesionario de Madrid (C. del Corazón de María, 23, Chamartín).

¿En qué puedo ayudarte?

- Buscar coches en stock según tus preferencias
- Información detallada de cualquier vehículo
- Reservar una prueba de conducción
- Calcular financiación orientativa
- Solicitar un vehículo a medida si no tenemos lo que buscas

Todos nuestros coches están revisados, con km certificados y entrega inmediata. Dime qué necesitas y te ayudo.`,

  `Hola, bienvenido a Renove. Soy tu asistente de ventas y estoy aquí para ayudarte a encontrar el coche perfecto.

Con más de 30 años de experiencia, en Renove todos los vehículos están revisados, con kilómetros certificados y listos para entrega.

Puedo ayudarte con:

- Búsqueda de coches en nuestro stock (presupuesto, año, km, combustible, etiqueta ECO/CERO...)
- Información detallada de cada vehículo
- Reserva de prueba de conducción
- Opciones de financiación orientativas
- Búsqueda personalizada a través de nuestros proveedores

¿Qué tipo de coche estás buscando o cuál es tu presupuesto?`,

  `Hola, soy el asistente de Renove, concesionario en Madrid con más de 30 años de trayectoria. Todos nuestros vehículos son nacionales, revisados, con km certificados y entrega inmediata.

Puedo ayudarte a:

- Encontrar coche en nuestro stock según lo que busques (presupuesto, año, km, combustible, plazas, etiqueta...)
- Darte información detallada de cada vehículo
- Agendar una prueba de conducción
- Calcular opciones de financiación orientativas
- Tramitar una solicitud de vehículo a medida si no tenemos lo que necesitas

Cuéntame qué tienes en mente y te hago una selección ahora mismo.`,

  `Hola, soy el asistente de ventas de Renove. Nuestro concesionario lleva más de 30 años en Madrid ofreciendo vehículos de ocasión, seminuevos e importación, todos revisados y con km certificados.

¿Cómo puedo ayudarte?

- Buscar en nuestro stock según tus necesidades
- Darte toda la información sobre cualquier vehículo
- Reservar una prueba de conducción (L\u2013V: 10:00\u201314:30 y 17:00\u201320:30, Sáb: 10:00\u201313:00)
- Calcular financiación orientativa
- Solicitar un coche a medida a través de nuestros proveedores

Dime qué buscas y te propongo las mejores opciones.`,
];

const CAR_GREETINGS = [
  `\u00a1Hola! Veo que estás mirando el **{make} {model}** {version} ({year}) que tenemos por **{price}**: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}** y etiqueta **{ecological_label}**.

\u00bfQué te gustaría saber? Puedo contarte sobre equipamiento, estado, historial, o si prefieres te preparo una simulación orientativa de financiación.`,

  `\u00bfQué tal? Ese **{make} {model}** {version} ({year}) por **{price}** es una gran opción: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}**, etiqueta **{ecological_label}**.

\u00bfTe cuento más sobre este vehículo o prefieres que te busque alternativas similares en nuestro stock?`,

  `Estás viendo nuestro **{make} {model}** {version} ({year}) por **{price}**: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}**, etiqueta **{ecological_label}**. Vehículo revisado, con km certificados y listo para entrega.

\u00bfQuieres saber más sobre equipamiento, historial o financiación?`,

  `\u00a1Hola! Veo que te interesa el **{make} {model}** {version} ({year}) que tenemos en Renove por **{price}**: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}**, etiqueta **{ecological_label}**.

\u00bfTe gustaría saber más sobre este vehículo: equipamiento, estado, mantenimiento? También puedo calcularte una financiación orientativa o buscarte alternativas similares.`,

  `Ahora mismo estás viendo el **{make} {model}** {version} ({year}) que tenemos por **{price}**: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}** y etiqueta **{ecological_label}**. Es un vehículo nacional, con km certificados y revisión completa.

\u00bfQué quieres saber? Puedo darte detalles de equipamiento, historial, o prepararte una simulación de financiación.`,

  `\u00bfTe gusta? El **{make} {model}** {version} ({year}) por **{price}**: **{fuel}**, **{transmission}**, **{power} CV**, **{mileage}**, etiqueta **{ecological_label}**. Vehículo revisado y con km certificados.

Dime qué te gustaría saber: equipamiento, estado, mantenimiento, financiación... o si prefieres que te busque opciones similares.`,

  `Veo que estás echando un vistazo al **{make} {model}** {version} ({year}) por **{price}**. Es **{fuel}**, **{transmission}**, **{power} CV**, con **{mileage}** y etiqueta **{ecological_label}**.

\u00bfEn qué puedo ayudarte? Puedo darte más detalles, calcular financiación orientativa o buscar alternativas en nuestro stock.`,
];

function formatPrice(price) {
  if (!price && price !== 0) return 'consultar';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTransmission(transmission) {
  if (!transmission) return 'N/D';
  const t = transmission.toUpperCase();
  if (t === 'A' || t === 'AUTOMATIC' || t === 'AUTO') return 'automático';
  if (t === 'M' || t === 'MANUAL') return 'manual';
  return transmission;
}

export function getRandomGreeting(type, carData) {
  if (type === 'car' && carData) {
    const template = CAR_GREETINGS[Math.floor(Math.random() * CAR_GREETINGS.length)];
    return template
      .replace(/\{make\}/g, carData.make || '')
      .replace(/\{model\}/g, carData.model || '')
      .replace(/\{version\}/g, carData.version || '')
      .replace(/\{year\}/g, carData.year || '')
      .replace(/\{price\}/g, formatPrice(carData.price))
      .replace(/\{fuel\}/g, carData.fuel || 'N/D')
      .replace(/\{mileage\}/g, carData.mileage || 'N/D')
      .replace(/\{transmission\}/g, formatTransmission(carData.transmission))
      .replace(/\{power\}/g, carData.power || 'N/D')
      .replace(/\{doors\}/g, carData.doors || '')
      .replace(/\{color\}/g, carData.color || '')
      .replace(/\{ecological_label\}/g, carData.ecological_label || 'N/D');
  }

  return GENERAL_GREETINGS[Math.floor(Math.random() * GENERAL_GREETINGS.length)];
}
