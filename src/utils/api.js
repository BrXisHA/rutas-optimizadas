/**
 * Geocoding con Nominatim (OpenStreetMap)
 * REGLA: delay obligatorio de ≥1s entre peticiones.
 */

// ─────────────────────────────────────────────────────────────────
// ⚠️  PON AQUÍ TU API KEY GRATUITA DE:
//     https://openrouteservice.org/dev/#/signup
// ─────────────────────────────────────────────────────────────────
export const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgxNmFiNjg1NzhkZjQ5NTA5OGE1Mjg2OTQ3ZjdlOGJjIiwiaCI6Im11cm11cjY0In0='

// En desarrollo usamos el proxy de Vite (/api/ors → api.openrouteservice.org)
// para evitar el bloqueo CORS del navegador.
// En producción la petición sale directo (el servidor de producción debe
// permitirlo, o bien añadir su propio proxy).
const ORS_BASE_URL = import.meta.env.DEV
  ? '/api/ors'                          // → proxy local de Vite (sin CORS)
  : 'https://api.openrouteservice.org'  // → URL directa en producción

// Nominatim: en DEV usamos el proxy de Vite (/api/nominatim) para evitar CORS.
// En producción la petición sale directo (los servidores de producción no tienen
// restricción de origen).
const NOMINATIM_BASE = import.meta.env.DEV
  ? '/api/nominatim'
  : 'https://nominatim.openstreetmap.org'

/**
 * Delay helper para respetar rate-limit de Nominatim (≥1s entre peticiones).
 */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Hace UNA petición a Nominatim con el query indicado.
 * @returns {Promise<[number,number]|null>}
 */
async function nominatimQuery(query) {
  const headers = import.meta.env.DEV
    ? {}
    : { 'User-Agent': 'DespachoRapidosPWA/1.0 (contacto@despachorapidos.app)' }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    'accept-language': 'es',
    addressdetails: '1',
  })

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, { headers })
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`)
  const data = await res.json()
  if (!data.length) return null
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)]
}

/**
 * Convierte una dirección de texto a coordenadas [lon, lat].
 * Usa hasta 3 intentos con variaciones del query para mejorar
 * la tasa de éxito con direcciones locales sin contexto de ciudad/país.
 *
 * @param {string} address
 * @returns {Promise<[number, number] | null>}
 */
export async function geocodeAddress(address) {
  const addr = address.trim()

  // ── Intento 1: dirección tal cual ────────────────────────────
  const r1 = await nominatimQuery(addr)
  if (r1) return r1

  // ── Intento 2: añadir "México" si no hay indicador de país ──
  const tienePais = /mexico|méxico|mex\b|jalisco|nuevo.?leon|cdmx|ciudad.?de.?mexico/i.test(addr)
  if (!tienePais) {
    await delay(1100) // respetar rate-limit entre reintentos
    const r2 = await nominatimQuery(`${addr}, México`)
    if (r2) return r2
  }

  // ── Intento 3: query simplificado (primeras 4 palabras + México) ─
  const palabras = addr.split(/[\s,]+/).filter(Boolean)
  if (palabras.length > 4) {
    await delay(1100)
    const simplificado = palabras.slice(0, 4).join(' ') + ', México'
    const r3 = await nominatimQuery(simplificado)
    if (r3) return r3
  }

  return null
}

/**
 * Optimiza la ruta usando OpenRouteService Optimization API.
 * @param {{id,coords,priority}[]} stops - Coordenadas de las paradas
 * @param {[number,number]} warehouseCoords - Almacén [lon,lat]
 * @returns {Promise<{orderedIds: number[], geometry: string}>}
 */
export async function optimizeRoute(stops, warehouseCoords) {
  if (!ORS_API_KEY || ORS_API_KEY === 'TU_ORS_API_KEY_AQUI') {
    throw new Error('Configura tu ORS_API_KEY en src/utils/api.js')
  }

  // ORS REQUIERE que los IDs de jobs sean enteros positivos.
  // Math.floor() garantiza esto aunque vengan de localStorage como floats.
  const jobs = stops.map((stop, index) => ({
    id: Math.floor(stop.id),   // ← ENTERO obligatorio para ORS
    location: stop.coords,     // [lon, lat]
    priority: stop.isUrgent ? 100 : 0,
  }))

  const payload = {
    jobs,
    vehicles: [
      {
        id: 1,
        profile: 'driving-car',
        start: warehouseCoords,
        end: warehouseCoords,
      },
    ],
  }

  const res = await fetch(`${ORS_BASE_URL}/optimization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ORS_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    // Mensaje de error más descriptivo para los casos más comunes
    if (res.status === 403) {
      throw new Error(
        'API Key inválida o sin permisos. Ve a https://openrouteservice.org/dev/#/signup, créate una cuenta gratuita, copia tu token y pégalo en src/utils/api.js (variable ORS_API_KEY).'
      )
    }
    throw new Error(`ORS Error ${res.status}: ${errText}`)
  }

  const data = await res.json()

  // Extrae el orden de los jobs desde la respuesta
  const route = data.routes?.[0]
  if (!route) throw new Error('ORS no devolvió rutas')

  const orderedIds = route.steps
    .filter((s) => s.type === 'job')
    .map((s) => s.job)

  // La geometría de la polilínea codificada viene en route.geometry
  return {
    orderedIds,
    geometry: route.geometry || null,
    summary: route.summary || {},
  }
}

/**
 * Decodifica una polilínea codificada (Polyline5) a array de [lat,lon].
 */
export function decodePolyline(encoded) {
  if (!encoded) return []
  const coords = []
  let index = 0, lat = 0, lon = 0

  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dLat

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLon = result & 1 ? ~(result >> 1) : result >> 1
    lon += dLon

    coords.push([lat / 1e5, lon / 1e5])
  }
  return coords
}

/**
 * Genera la URL de Waze para navegar a unas coordenadas.
 */
export function wazeUrl(lat, lon) {
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes&zoom=17`
}

/**
 * Genera la URL de Google Maps para navegar a unas coordenadas.
 */
export function googleMapsUrl(lat, lon) {
  return `https://maps.google.com/?daddr=${lat},${lon}&directionsmode=driving`
}

/**
 * Formatea metros a texto legible.
 */
export function formatDistance(meters) {
  if (!meters) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

/**
 * Formatea segundos a texto legible.
 */
export function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}
