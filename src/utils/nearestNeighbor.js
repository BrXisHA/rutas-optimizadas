/**
 * nearestNeighbor.js
 * Algoritmo de Vecino Más Cercano con prioridad de urgentes.
 *
 * Entrada:
 *   - almacen: { lat, lng }
 *   - paradas: [{ clienteId, nombre, lat, lng, isUrgente }]
 *
 * Salida: paradas reordenadas (urgentes primero, luego normales)
 */

/** Distancia Haversine en km entre dos puntos GPS */
function haversine(a, b) {
  const R  = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const x =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/**
 * Ejecuta Vecino Más Cercano sobre un subconjunto de paradas,
 * partiendo desde `origen`.
 * Devuelve las paradas ordenadas.
 */
function nnSubset(origen, paradas) {
  const pendientes = [...paradas]
  const ordenadas  = []
  let actual = origen

  while (pendientes.length) {
    let minDist = Infinity
    let minIdx  = 0

    for (let i = 0; i < pendientes.length; i++) {
      const d = haversine(actual, pendientes[i])
      if (d < minDist) {
        minDist = d
        minIdx  = i
      }
    }

    const siguiente = pendientes.splice(minIdx, 1)[0]
    ordenadas.push(siguiente)
    actual = siguiente
  }

  return ordenadas
}

/**
 * Optimiza la ruta en dos fases:
 *   Fase 1: urgentes (NN desde el almacén)
 *   Fase 2: normales (NN desde la última parada urgente, o almacén si no hay)
 *
 * @param {{ lat: number, lng: number }} almacen
 * @param {Array<{ clienteId: string, nombre: string, lat: number, lng: number, isUrgente: boolean }>} paradas
 * @returns {Array} paradas reordenadas
 */
export function optimizarRuta(almacen, paradas) {
  const urgentes = paradas.filter((p) => p.isUrgente)
  const normales = paradas.filter((p) => !p.isUrgente)

  const urgentesOrdenados = nnSubset(almacen, urgentes)

  const puntoDePartida =
    urgentesOrdenados.length > 0
      ? urgentesOrdenados[urgentesOrdenados.length - 1]
      : almacen

  const normalesOrdenados = nnSubset(puntoDePartida, normales)

  return [...urgentesOrdenados, ...normalesOrdenados]
}
