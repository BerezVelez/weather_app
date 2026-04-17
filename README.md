# 🌤️ Weather App — Consulta de Clima en Tiempo Real

_Aplicación web que muestra el clima actual de cualquier ciudad del mundo con una interfaz visual que se adapta dinámicamente a la condición climática. Construida con HTML, CSS y JavaScript puro — sin frameworks, sin dependencias, sin API key. Solo abre el archivo y busca tu ciudad._

---

## Comenzando 🚀

_Estas instrucciones te permitirán obtener una copia del proyecto en funcionamiento en tu máquina local para propósitos de desarrollo, pruebas o uso personal._

---

### Pre-requisitos 📋

_Lo único que necesitas para ejecutar la aplicación:_

```
✅ Un navegador moderno (Chrome, Firefox, Edge o Safari)
✅ Conexión a internet (para consultar la API de Open-Meteo)
```

_Lo que NO necesitas:_

```
❌ Node.js ni npm
❌ Python ni pip
❌ Servidor local (ni XAMPP, ni Live Server)
❌ API key ni registro en ningún servicio
```

---

### Instalación 🔧

_Sigue estos pasos para tener la app corriendo en tu máquina:_

**1. Clona el repositorio**

```bash
git clone https://github.com/tu-usuario/weather-app.git
cd weather-app
```

**2. Abre el archivo en tu navegador**

```bash
# Opción A: doble clic en el archivo
# Simplemente navega a la carpeta y haz doble clic en index.html

# Opción B: desde la terminal
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

> 💡 **Eso es todo.** No hay dependencias que instalar, no hay build que ejecutar, no hay servidor que levantar.

---

## Guía de Uso ▶️

_Cómo interactuar con la aplicación paso a paso:_

**1. Busca una ciudad**

Escribe el nombre de cualquier ciudad en el campo de búsqueda. Funciona en español e inglés:

```
Ejemplos válidos: "Monterrey", "Tokyo", "Ciudad de México", "London", "São Paulo"
```

**2. Ejecuta la búsqueda**

Presiona la tecla `Enter` o haz clic en el botón de buscar.

**3. Visualiza el resultado**

La app mostrará una card con:

- Nombre de la ciudad y país
- Temperatura actual en °C
- Sensación térmica en °C
- Humedad relativa (%)
- Velocidad del viento (km/h)
- Condición climática en texto
- Tema visual que cambia automáticamente según el clima

**4. Busca otra ciudad**

Simplemente escribe un nuevo nombre y busca de nuevo. La card se actualiza con los nuevos datos y el tema visual correspondiente.

---

## Ejemplo de Resultados 📸

_Así se ven los datos en la card según diferentes condiciones climáticas:_

**Ejemplo 1 — Soleado ☀️**

```
┌──────────────────────────────────┐
│  ☀️  Monterrey, México           │
│                                  │
│  Temperatura:     34°C           │
│  Sensación:       37°C           │
│                                  │
│  💧 45%   💨 12 km/h             │
│  Cielo despejado                 │
└──────────────────────────────────┘
Tema visual: fondo dorado cálido con brillo pulsante
```

**Ejemplo 2 — Lluvia 🌧️**

```
┌──────────────────────────────────┐
│  🌧️  Londres, Reino Unido        │
│                                  │
│  Temperatura:     12°C           │
│  Sensación:        9°C           │
│                                  │
│  💧 88%   💨 23 km/h             │
│  Lluvia moderada                 │
└──────────────────────────────────┘
Tema visual: fondo azul frío con animación de gotas cayendo
```

**Ejemplo 3 — Nieve ❄️**

```
┌──────────────────────────────────┐
│  ❄️  Helsinki, Finlandia          │
│                                  │
│  Temperatura:     -8°C           │
│  Sensación:      -14°C           │
│                                  │
│  💧 76%   💨 18 km/h             │
│  Nevada ligera                   │
└──────────────────────────────────┘
Tema visual: fondo cyan glacial con copos flotantes
```

---

## Funcionalidades ⚙️

_Lista de las funciones clave implementadas en la aplicación:_

- **Búsqueda por nombre de ciudad** — Geocoding automático que convierte el nombre en coordenadas mediante la API de Open-Meteo
- **Datos en tiempo real** — Temperatura actual, sensación térmica, humedad relativa, velocidad del viento y condición climática
- **5 temas visuales dinámicos** — La card cambia colores, fondo y animaciones según el código WMO del clima:
  - ☀️ Soleado → tonos ámbar cálidos, brillo pulsante
  - ⛅ Nublado → grises azulados, nubes deslizándose
  - 🌧️ Lluvia → azules fríos, gotas cayendo
  - ❄️ Nieve → blancos y cyan, copos flotantes
  - ⛈️ Tormenta → púrpuras oscuros, destello sutil
- **Animaciones CSS ligeras** — Solo `@keyframes` CSS, sin canvas ni librerías de partículas
- **Responsive** — Funciona en móvil (360px) y desktop (1200px+)
- **Accesibilidad** — `aria-live="polite"` para lectores de pantalla, `aria-label` descriptivos, `prefers-reduced-motion` respetado
- **Zero dependencias** — Un solo archivo HTML, sin frameworks, sin CDN, sin servidor
- **Manejo robusto de errores** — 3 capas de validación con mensajes claros en español (ver sección siguiente)

---

## Manejo de Errores 🛡️

_La aplicación implementa 3 capas de validación para cubrir todos los escenarios posibles:_

### Capa 1 — Validación de entrada

_Estas validaciones ocurren antes de hacer cualquier llamada a la API._

| Caso | Condición | Acción |
|------|-----------|--------|
| Campo vacío | El usuario busca sin escribir nada | Mensaje: "Escribe el nombre de una ciudad para buscar" |
| Solo espacios | Input contiene solo espacios en blanco | Se aplica `trim()`, se trata como campo vacío |
| Caracteres inválidos | Input con `@`, `#`, `$`, `%` u otros | Mensaje: "Ingresa un nombre de ciudad válido" |
| Doble clic en buscar | El usuario presiona buscar durante una petición activa | El botón se deshabilita y muestra spinner hasta completar |
| Enter sin texto | Presiona Enter con el campo vacío | Mismo comportamiento que campo vacío |

### Capa 2 — Errores de red y API

_Estas validaciones manejan fallos durante las llamadas `fetch` al geocoding o al endpoint de clima._

| Caso | Condición | Mensaje al usuario |
|------|-----------|-------------------|
| Sin conexión | `fetch` lanza `TypeError` (navegador sin red) | "Sin conexión a internet. Revisa tu red e intenta de nuevo." 📡 |
| Timeout | La API no responde en 8 segundos | "La solicitud tardó demasiado. Intenta de nuevo." |
| Rate limit | La API responde con HTTP 429 | "Demasiadas consultas. Espera unos segundos e intenta de nuevo." |
| Servidor caído | La API responde con HTTP 500, 502 o 503 | "El servicio de clima no está disponible. Intenta más tarde." |
| Ciudad no encontrada | El geocoding devuelve `results` vacío o `undefined` | "No encontramos '{ciudad}'. Verifica el nombre e intenta de nuevo." ❌ |
| Red lenta | Respuesta tarda pero eventualmente llega | Se muestra skeleton/spinner después de 300ms de espera |

### Capa 3 — Procesamiento de respuesta

_Estas validaciones protegen contra datos inesperados después de recibir la respuesta de la API._

| Caso | Condición | Acción |
|------|-----------|--------|
| Campos null | `temperature_2m`, humedad o viento vienen como `null` | Se muestra "--" en el campo faltante; el resto se renderiza normal |
| `weather_code` desconocido | Código WMO no mapeado en el objeto de temas | Se aplica tema default: fondo gris neutro con 🌤️ |
| JSON malformado | `response.json()` lanza error de parsing | Mensaje: "Error al procesar la respuesta del servidor" |
| Temperaturas extremas | Valores como -50°C o +55°C | Se muestran tal cual (son válidos en la Tierra) |
| Cambio en estructura de la API | El campo `current` ya no existe en la respuesta | Se valida `response.current` antes de leer propiedades; error genérico si falta |

### Arquitectura del manejo de errores

```javascript
// Función centralizada para mostrar errores
function mostrarError(tipo, ciudad) {
  // tipo: "vacio" | "invalido" | "no-encontrada" | "red"
  //       "timeout" | "rate-limit" | "servidor" | "formato"
  // Cada tipo tiene su mensaje, emoji y estilo de borde en la card
}

// Try/catch global con handlers específicos
async function buscarClima(ciudad) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Paso 1: Geocoding
    const geoRes = await fetch(GEO_URL + ciudad, { signal: controller.signal });
    if (geoRes.status === 429) return mostrarError('rate-limit');
    if (geoRes.status >= 500) return mostrarError('servidor');

    const geoData = await geoRes.json();
    if (!geoData.results?.length) return mostrarError('no-encontrada', ciudad);

    // Paso 2: Clima actual
    const climaRes = await fetch(buildClimaURL(geoData), { signal: controller.signal });
    const climaData = await climaRes.json();
    if (!climaData.current) return mostrarError('formato');

    clearTimeout(timeout);
    renderizarCard(geoData, climaData);

  } catch (error) {
    if (error.name === 'AbortError') mostrarError('timeout');
    else if (error.name === 'TypeError') mostrarError('red');
    else mostrarError('formato');
  }
}
```

---

## Información de la API 🌐

_La aplicación utiliza dos endpoints gratuitos de [Open-Meteo](https://open-meteo.com/). No requieren API key, registro ni autenticación._

### 1. Geocoding API

Convierte el nombre de una ciudad en coordenadas geográficas.

```
GET https://geocoding-api.open-meteo.com/v1/search
    ?name={ciudad}
    &count=1
    &language=es
```

| Parámetro | Descripción |
|-----------|-------------|
| `name` | Nombre de la ciudad a buscar |
| `count` | Cantidad de resultados (usamos 1) |
| `language` | Idioma de los nombres devueltos |

**Ejemplo de respuesta:**

```json
{
  "results": [
    {
      "name": "Monterrey",
      "latitude": 25.6714,
      "longitude": -100.309,
      "country": "México",
      "country_code": "MX"
    }
  ]
}
```

### 2. Forecast API

Obtiene los datos del clima actual usando las coordenadas.

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude={lat}
    &longitude={lon}
    &current=temperature_2m,apparent_temperature,
             relative_humidity_2m,wind_speed_10m,weather_code
    &temperature_unit=celsius
    &wind_speed_unit=kmh
    &timezone=auto
```

| Parámetro | Descripción |
|-----------|-------------|
| `latitude` / `longitude` | Coordenadas obtenidas del geocoding |
| `current` | Campos del clima actual a solicitar |
| `temperature_unit` | Unidades de temperatura (`celsius`) |
| `wind_speed_unit` | Unidades de viento (`kmh`) |
| `timezone` | Zona horaria automática según la ubicación |

**Ejemplo de respuesta:**

```json
{
  "current": {
    "temperature_2m": 34.2,
    "apparent_temperature": 37.1,
    "relative_humidity_2m": 45,
    "wind_speed_10m": 12.5,
    "weather_code": 0
  }
}
```

### 3. Tabla de WMO Weather Codes

_Códigos estándar de la Organización Meteorológica Mundial utilizados para determinar el tema visual de la card._

| Código WMO | Condición | Tema visual |
|------------|-----------|-------------|
| 0 | Cielo despejado | ☀️ Soleado |
| 1, 2, 3 | Parcialmente nublado | ⛅ Nublado |
| 45, 48 | Niebla | ⛅ Nublado |
| 51, 53, 55 | Llovizna (ligera a densa) | 🌧️ Lluvia |
| 56, 57 | Llovizna helada | 🌧️ Lluvia |
| 61, 63, 65 | Lluvia (ligera a fuerte) | 🌧️ Lluvia |
| 66, 67 | Lluvia helada | 🌧️ Lluvia |
| 71, 73, 75 | Nevada (ligera a fuerte) | ❄️ Nieve |
| 77 | Granizo de nieve | ❄️ Nieve |
| 80, 81, 82 | Chubascos (ligeros a violentos) | 🌧️ Lluvia |
| 85, 86 | Chubascos de nieve | ❄️ Nieve |
| 95 | Tormenta eléctrica | ⛈️ Tormenta |
| 96, 99 | Tormenta con granizo | ⛈️ Tormenta |
| _Cualquier otro_ | _Código no mapeado_ | 🌤️ _Default (gris neutro)_ |

---

## Mejoras Futuras 🔮

_Funciones y mejoras planeadas para próximas versiones:_

- **Pronóstico extendido** — Mostrar el clima de los próximos 5 días con gráfica de temperatura por hora
- **Geolocalización automática** — Detectar la ubicación del usuario con `navigator.geolocation` para mostrar el clima local al abrir la app
- **Toggle modo oscuro / claro** — Selector manual independiente del tema climático
- **Historial de búsquedas** — Guardar las últimas ciudades buscadas en `localStorage` para acceso rápido
- **Selector de unidades** — Permitir cambiar entre °C / °F y km/h / mph
- **Soporte offline** — Service Worker con caché para mostrar la última consulta sin conexión
- **Comparar ciudades** — Mostrar el clima de dos o más ciudades lado a lado
- **Mapa interactivo** — Clic en un mapa para seleccionar la ubicación en lugar de escribir

---

## Construido con 🛠️

- [HTML5](https://developer.mozilla.org/es/docs/Web/HTML) — Estructura semántica de la aplicación
- [CSS3](https://developer.mozilla.org/es/docs/Web/CSS) — Estilos, temas dinámicos y animaciones (`@keyframes`)
- [JavaScript ES6+](https://developer.mozilla.org/es/docs/Web/JavaScript) — Lógica de la app: `fetch`, `async/await`, `AbortController`
- [Open-Meteo API](https://open-meteo.com/) — Geocoding y datos de clima en tiempo real (gratuita, sin API key)

---

## Autores ✒️

- **Tu Nombre** — _Desarrollo completo_ — [@tu-usuario](https://github.com/tu-usuario)

---

## Licencia 📄

Este proyecto está bajo la Licencia MIT — consulta el archivo [LICENSE](LICENSE) para más detalles.

---

⌨️ con ❤️ usando [Open-Meteo](https://open-meteo.com/) 🌍