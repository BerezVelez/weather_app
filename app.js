/* ============================================================
   CONFIGURACIÓN GLOBAL
   Centraliza URLs, timeouts, límites y parámetros de la API.
   ============================================================ */
const CONFIG = {
  API: {
    GEO_URL: 'https://geocoding-api.open-meteo.com/v1/search',
    FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',
    TIMEOUT_MS: 8000,
    MAX_RESULTS: 1,
    LANGUAGE: 'es',
    TEMP_UNIT: 'celsius',
    WIND_UNIT: 'kmh',
  },
  CACHE: {
    TTL_MS: 10 * 60 * 1000,
  },
  UI: {
    MAX_CIUDADES: 3,
    DIAS_FORECAST: 7,
  },
};

/* ============================================================
   ESTADO GLOBAL — Fuente de verdad centralizada
   El DOM se renderiza DESDE este estado, nunca al revés.
   ============================================================ */
const appState = { ciudades: [] };

/* ============================================================
   CACHÉ EN MEMORIA CON TTL
   Evita re-fetch de datos recientes por ciudad.
   ============================================================ */
const cache = new Map();

function cacheKey(ciudad) {
  return ciudad.trim().toLowerCase();
}

function cacheGet(ciudad) {
  const key = cacheKey(ciudad);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CONFIG.CACHE.TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(ciudad, data) {
  cache.set(cacheKey(ciudad), { data, timestamp: Date.now() });
}

/* ============================================================
   TEMAS Y WMO CODES
   ============================================================ */
const TEMAS = {
  soleado: { clase: 'theme-sunny', condicion: 'Despejado', emoji: '☀️', fondo: '#1c1408', acento: '#F59E0B', textoPrimario: '#fef3c7', textoSecundario: '#d97706' },
  nublado: { clase: 'theme-cloudy', condicion: 'Nublado', emoji: '⛅', fondo: '#1e2837', acento: '#94A3B8', textoPrimario: '#e2e8f0', textoSecundario: '#64748b' },
  lluvia: { clase: 'theme-rain', condicion: 'Lluvia', emoji: '🌧️', fondo: '#0c1929', acento: '#3B82F6', textoPrimario: '#dbeafe', textoSecundario: '#60a5fa' },
  nieve: { clase: 'theme-snow', condicion: 'Nieve', emoji: '❄️', fondo: '#0c1a2e', acento: '#7DD3FC', textoPrimario: '#E0F2FE', textoSecundario: '#7DD3FC' },
  tormenta: { clase: 'theme-storm', condicion: 'Tormenta', emoji: '⛈️', fondo: '#110b20', acento: '#7C3AED', textoPrimario: '#ede9fe', textoSecundario: '#a78bfa' },
};

const CONDICIONES_WMO = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna intensa',
  56: 'Llovizna helada ligera', 57: 'Llovizna helada intensa',
  61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
  66: 'Lluvia helada ligera', 67: 'Lluvia helada intensa',
  71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve intensa', 77: 'Granizo',
  80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
  85: 'Nieve ligera intermitente', 86: 'Nieve intensa intermitente',
  95: 'Tormenta eléctrica', 96: 'Tormenta con granizo ligero', 99: 'Tormenta con granizo intenso',
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function clasificarWeatherCode(code) {
  if (code === 0) return 'soleado';
  if (code >= 1 && code <= 3) return 'nublado';
  if (code === 45 || code === 48) return 'nublado';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'lluvia';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'nieve';
  if (code >= 95 && code <= 99) return 'tormenta';
  return 'nublado';
}

/* ============================================================
   CAPA DE API — Funciones puras de fetch
   ============================================================ */
class AppError extends Error {
  constructor(tipo, ciudad = '') {
    super(tipo);
    this.tipo = tipo;
    this.ciudad = ciudad;
  }
}

function validarResponse(response) {
  if (response.status === 429) throw new AppError('rate-limit');
  if (response.status >= 500) throw new AppError('servidor');
  if (!response.ok) throw new AppError('formato');
}

async function obtenerCoordenadas(ciudad, signal) {
  const url = `${CONFIG.API.GEO_URL}?name=${encodeURIComponent(ciudad)}&count=${CONFIG.API.MAX_RESULTS}&language=${CONFIG.API.LANGUAGE}`;
  const response = await fetch(url, { signal });
  validarResponse(response);
  const data = await response.json();
  if (!data.results?.length) throw new AppError('no-encontrada', ciudad);
  return data.results[0];
}

async function obtenerClima(lat, lon, signal) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    hourly: 'temperature_2m,weather_code',
    temperature_unit: CONFIG.API.TEMP_UNIT,
    wind_speed_unit: CONFIG.API.WIND_UNIT,
    timezone: 'auto',
    forecast_days: CONFIG.UI.DIAS_FORECAST,
  });
  const response = await fetch(`${CONFIG.API.FORECAST_URL}?${params}`, { signal });
  validarResponse(response);
  const data = await response.json();
  if (!data.current) throw new AppError('formato');
  return data;
}

/* ============================================================
   ORQUESTADOR — Fetch para UNA ciudad (con caché + abort)
   ============================================================ */
const activeControllers = new Map();

async function buscarClimaCiudad(nombreCiudad) {
  const id = cacheKey(nombreCiudad);

  if (activeControllers.has(id)) activeControllers.get(id).abort();

  const cached = cacheGet(nombreCiudad);
  if (cached) return cached;

  const controller = new AbortController();
  activeControllers.set(id, controller);
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT_MS);

  try {
    const ubicacion = await obtenerCoordenadas(nombreCiudad, controller.signal);
    const climaData = await obtenerClima(ubicacion.latitude, ubicacion.longitude, controller.signal);

    const resultado = {
      ubicacion: { name: ubicacion.name, country: ubicacion.country, country_code: ubicacion.country_code, latitude: ubicacion.latitude, longitude: ubicacion.longitude },
      climaActual: climaData.current,
      forecast: { daily: climaData.daily, hourly: climaData.hourly },
      categoriaTema: clasificarWeatherCode(climaData.current.weather_code),
    };

    cacheSet(nombreCiudad, resultado);
    return resultado;
  } finally {
    clearTimeout(timeoutId);
    activeControllers.delete(id);
  }
}

/* ============================================================
   UTILIDADES DE DOM
   ============================================================ */
function crearElemento(tag, texto, clase) {
  const el = document.createElement(tag);
  if (texto) el.textContent = texto;
  if (clase) el.className = clase;
  return el;
}

function flagEmoji(code) {
  if (!code) return '';
  try {
    return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('');
  } catch { return code.toUpperCase(); }
}

/* ============================================================
   RENDERIZADO — Card completa con forecast y gráfica horaria
   ============================================================ */
function renderizarCardCiudad(datos, ciudadId) {
  const { ubicacion, climaActual, forecast, categoriaTema } = datos;
  const tema = TEMAS[categoriaTema];
  const condicionTexto = CONDICIONES_WMO[climaActual.weather_code] || tema.condicion;

  const card = crearElemento('div', null, `weather-card visible ${tema.clase}`);
  card.dataset.ciudadId = ciudadId;

  /* Botón cerrar (solo si hay >1 ciudad) */
  if (appState.ciudades.length > 1) {
    const closeBtn = crearElemento('button', '✕', 'city-close-btn');
    closeBtn.setAttribute('aria-label', `Quitar ${ubicacion.name}`);
    closeBtn.addEventListener('click', () => eliminarCiudad(ciudadId));
    card.appendChild(closeBtn);
  }

  /* Animación */
  const animDiv = crearElemento('div', null, 'weather-animation');
  card.appendChild(animDiv);

  /* Ubicación */
  const loc = crearElemento('div', null, 'location');
  loc.appendChild(crearElemento('h2', ubicacion.name));
  loc.appendChild(crearElemento('span', `${flagEmoji(ubicacion.country_code)} ${ubicacion.country}`, 'country'));
  card.appendChild(loc);

  /* Temperatura */
  const temp = crearElemento('div', null, 'temp-block');
  temp.appendChild(crearElemento('span', `${Math.round(climaActual.temperature_2m ?? 0)}°C`, 'temp-main'));
  temp.appendChild(crearElemento('span', `Sensación: ${Math.round(climaActual.apparent_temperature ?? 0)}°C`, 'temp-feels'));
  card.appendChild(temp);

  /* Detalles */
  const details = crearElemento('div', null, 'details-row');
  const hum = crearElemento('div', null, 'detail');
  hum.appendChild(crearElemento('span', '💧', 'detail-emoji'));
  hum.appendChild(crearElemento('span', `${climaActual.relative_humidity_2m ?? '--'}%`));
  details.appendChild(hum);
  const wind = crearElemento('div', null, 'detail');
  wind.appendChild(crearElemento('span', '💨', 'detail-emoji'));
  wind.appendChild(crearElemento('span', `${climaActual.wind_speed_10m ?? '--'} km/h`));
  details.appendChild(wind);
  card.appendChild(details);

  /* Condición */
  const cond = crearElemento('div', null, 'condition-block');
  cond.appendChild(crearElemento('span', tema.emoji, 'condition-emoji'));
  cond.appendChild(crearElemento('span', condicionTexto, 'condition-text'));
  card.appendChild(cond);

  /* Forecast 7 días */
  if (forecast?.daily?.time) {
    const section = crearElemento('div', null, 'forecast-section');
    section.appendChild(crearElemento('h3', 'Próximos días', 'forecast-title'));
    const grid = crearElemento('div', null, 'forecast-grid');

    forecast.daily.time.forEach((fecha, i) => {
      const dia = new Date(fecha + 'T00:00:00');
      const label = i === 0 ? 'Hoy' : DIAS_SEMANA[dia.getDay()];
      const dayTema = TEMAS[clasificarWeatherCode(forecast.daily.weather_code[i])];

      const dayCard = crearElemento('div', null, 'forecast-day');
      dayCard.appendChild(crearElemento('span', label, 'forecast-day-name'));
      dayCard.appendChild(crearElemento('span', dayTema.emoji, 'forecast-day-emoji'));

      const temps = crearElemento('span', null, 'forecast-day-temps');
      temps.appendChild(crearElemento('span', `${Math.round(forecast.daily.temperature_2m_max[i])}°`, 'temp-max'));
      temps.appendChild(crearElemento('span', `${Math.round(forecast.daily.temperature_2m_min[i])}°`, 'temp-min'));
      dayCard.appendChild(temps);
      grid.appendChild(dayCard);
    });

    section.appendChild(grid);
    card.appendChild(section);
  }

  /* Gráfica horaria (próximas 24h) */
  if (forecast?.hourly?.time) {
    const section = crearElemento('div', null, 'hourly-section');
    section.appendChild(crearElemento('h3', 'Próximas 24 horas', 'forecast-title'));
    const scroll = crearElemento('div', null, 'hourly-scroll');

    const ahora = new Date();
    const startIdx = Math.max(0, forecast.hourly.time.findIndex(t => new Date(t) >= ahora));
    const endIdx = Math.min(startIdx + 24, forecast.hourly.time.length);
    const temps24 = forecast.hourly.temperature_2m.slice(startIdx, endIdx);
    const tMin = Math.min(...temps24);
    const tMax = Math.max(...temps24);
    const tRange = tMax - tMin || 1;

    for (let i = startIdx; i < endIdx; i++) {
      const hora = new Date(forecast.hourly.time[i]);
      const t = forecast.hourly.temperature_2m[i];
      const barH = 10 + ((t - tMin) / tRange) * 50;

      const item = crearElemento('div', null, 'hourly-item');
      item.appendChild(crearElemento('span', `${Math.round(t)}°`, 'hourly-temp'));
      const bar = crearElemento('div', null, 'hourly-bar');
      bar.style.height = `${barH}px`;
      item.appendChild(bar);
      item.appendChild(crearElemento('span', `${hora.getHours().toString().padStart(2, '0')}:00`, 'hourly-time'));
      scroll.appendChild(item);
    }

    section.appendChild(scroll);
    card.appendChild(section);
  }

  generarAnimaciones(animDiv, categoriaTema);
  return card;
}

/* ============================================================
   ANIMACIONES TEMÁTICAS
   ============================================================ */
function generarAnimaciones(container, categoriaTema) {
  container.innerHTML = '';
  if (categoriaTema === 'lluvia') {
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('div');
      d.className = 'raindrop';
      d.style.left = `${8 + Math.random() * 84}%`;
      d.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
      d.style.animationDelay = `${Math.random() * 2}s`;
      d.style.height = `${12 + Math.random() * 10}px`;
      container.appendChild(d);
    }
  }
  if (categoriaTema === 'nieve') {
    const chars = ['❄', '❅', '❆', '✦'];
    for (let i = 0; i < 8; i++) {
      const f = document.createElement('div');
      f.className = 'snowflake';
      f.textContent = chars[i % chars.length];
      f.style.left = `${5 + Math.random() * 90}%`;
      f.style.fontSize = `${0.6 + Math.random() * 0.8}rem`;
      f.style.animationDuration = `${3 + Math.random() * 4}s`;
      f.style.animationDelay = `${Math.random() * 5}s`;
      f.style.opacity = `${0.3 + Math.random() * 0.5}`;
      container.appendChild(f);
    }
  }
}

/* ============================================================
   GESTIÓN DE ESTADO Y RENDERIZADO GLOBAL
   ============================================================ */
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function aplicarTemaGlobal(categoriaTema) {
  const tema = TEMAS[categoriaTema];
  document.body.style.background = tema.fondo;
  document.documentElement.style.setProperty('--accent', tema.acento);
  document.documentElement.style.setProperty('--text-primary', tema.textoPrimario);
  document.documentElement.style.setProperty('--text-secondary', tema.textoSecundario);
}

function renderizarTodo() {
  const container = document.getElementById('citiesContainer');
  container.innerHTML = '';

  if (appState.ciudades.length === 0) {
    container.classList.remove('multi');
    return;
  }

  const primera = appState.ciudades[0];
  if (primera.categoriaTema) aplicarTemaGlobal(primera.categoriaTema);

  container.classList.toggle('multi', appState.ciudades.length > 1);

  appState.ciudades.forEach(ciudad => {
    if (ciudad.isLoading) {
      const lc = crearElemento('div', null, 'weather-card visible loading-card');
      const sp = crearElemento('div', null, 'card-spinner');
      sp.appendChild(crearElemento('span', null, 'spinner'));
      sp.appendChild(document.createTextNode(` Buscando ${ciudad.nombre}…`));
      lc.appendChild(sp);
      container.appendChild(lc);

    } else if (ciudad.error) {
      const ec = crearElemento('div', null, 'weather-card visible error-card');
      if (appState.ciudades.length > 1) {
        const cb = crearElemento('button', '✕', 'city-close-btn');
        cb.addEventListener('click', () => eliminarCiudad(ciudad.id));
        ec.appendChild(cb);
      }
      ec.appendChild(crearElemento('p', ciudad.error, 'card-error-msg'));
      container.appendChild(ec);

    } else if (ciudad.ubicacion) {
      container.appendChild(renderizarCardCiudad({
        ubicacion: ciudad.ubicacion,
        climaActual: ciudad.climaActual,
        forecast: ciudad.forecast,
        categoriaTema: ciudad.categoriaTema,
      }, ciudad.id));
    }
  });

  actualizarBotonAgregar();
}

function actualizarBotonAgregar() {
  const btn = document.getElementById('addCityBtn');
  if (btn) btn.style.display = appState.ciudades.length >= CONFIG.UI.MAX_CIUDADES ? 'none' : '';
}

function eliminarCiudad(ciudadId) {
  appState.ciudades = appState.ciudades.filter(c => c.id !== ciudadId);
  renderizarTodo();
}

/* ============================================================
   MOSTRAR ESTADO GLOBAL (mensajes fuera de cards)
   ============================================================ */
function mostrarEstado(tipo, mensaje) {
  const el = document.getElementById('statusMsg');
  if (tipo === 'hide') { el.classList.remove('visible'); return; }
  el.className = `status-message ${tipo} visible`;
  el.textContent = '';
  if (tipo === 'loading') {
    el.appendChild(crearElemento('span', null, 'spinner'));
    el.appendChild(document.createTextNode(mensaje));
  } else {
    el.textContent = mensaje;
  }
}

/* ============================================================
   FUNCIÓN PRINCIPAL — Agregar una ciudad al dashboard
   ============================================================ */
async function agregarCiudad(nombreCiudad) {
  const nombre = nombreCiudad.trim();
  if (!nombre) { mostrarEstado('error', '⚠️ Escribe el nombre de una ciudad.'); return; }
  if (appState.ciudades.some(c => cacheKey(c.nombre) === cacheKey(nombre))) {
    mostrarEstado('error', `"${nombre}" ya está en la lista.`); return;
  }
  if (appState.ciudades.length >= CONFIG.UI.MAX_CIUDADES) {
    mostrarEstado('error', `Máximo ${CONFIG.UI.MAX_CIUDADES} ciudades.`); return;
  }

  mostrarEstado('hide');
  const ciudadId = generarId();
  appState.ciudades.push({ id: ciudadId, nombre, ubicacion: null, climaActual: null, forecast: null, categoriaTema: null, isLoading: true, error: null });
  renderizarTodo();

  try {
    const resultado = await buscarClimaCiudad(nombre);
    const entry = appState.ciudades.find(c => c.id === ciudadId);
    if (!entry) return;
    Object.assign(entry, { ...resultado, isLoading: false });
    renderizarTodo();
  } catch (error) {
    const entry = appState.ciudades.find(c => c.id === ciudadId);
    if (!entry) return;
    entry.isLoading = false;
    if (error.name === 'AbortError') entry.error = '⏱️ La solicitud tardó demasiado.';
    else if (error instanceof AppError) {
      const msgs = { 'no-encontrada': `😔 No se encontró "${error.ciudad}".`, 'rate-limit': '⏳ Demasiadas consultas.', 'servidor': '🔧 Servicio no disponible.', 'formato': '⚠️ Error al procesar respuesta.' };
      entry.error = msgs[error.tipo] || '❌ Error inesperado.';
    } else if (error.name === 'TypeError') entry.error = '📡 Sin conexión a internet.';
    else entry.error = '❌ Error inesperado.';
    renderizarTodo();
  }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('cityInput');
    agregarCiudad(input.value);
    input.value = '';
  });
  document.getElementById('addCityBtn').addEventListener('click', () => {
    const input = document.getElementById('cityInput');
    input.focus();
  });
  document.getElementById('cityInput').focus();
});