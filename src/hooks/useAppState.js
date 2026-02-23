import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEYS = {
  RUTA_ACTIVA:  'dr_ruta_activa',
  HISTORIAL:    'dr_historial',
  PEDIDOS_TEMP: 'dr_pedidos_temp',
}

// ── Almacén fijo — no editable por el usuario ──────────────────────
// Formato ORS: [longitud, latitud]
export const ALMACEN_FIJO = {
  direccion: 'Almacén principal',
  coords: [-93.19299112393828, 16.77146959206133], // [lon, lat]
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('localStorage write error:', e)
  }
}

export function useAppState() {
  // ── Pedidos temporales (aún no optimizados) ────────────────────
  const [pedidos, setPedidos] = useState(() =>
    readJSON(STORAGE_KEYS.PEDIDOS_TEMP, [])
  )

  // ── Ruta activa (resultado de la optimización) ─────────────────
  const [rutaActiva, setRutaActivaState] = useState(() =>
    readJSON(STORAGE_KEYS.RUTA_ACTIVA, null)
  )

  // ── Historial de rutas ─────────────────────────────────────────
  const [historial, setHistorialState] = useState(() =>
    readJSON(STORAGE_KEYS.HISTORIAL, [])
  )

  // ── Estado de progreso de entregas ─────────────────────────────
  const [pedidoEntregado, setPedidoEntregado] = useState({})

  // ── Persistencia automática ────────────────────────────────────
  useEffect(() => { writeJSON(STORAGE_KEYS.PEDIDOS_TEMP, pedidos)   }, [pedidos])
  useEffect(() => { writeJSON(STORAGE_KEYS.RUTA_ACTIVA,  rutaActiva) }, [rutaActiva])
  useEffect(() => { writeJSON(STORAGE_KEYS.HISTORIAL,    historial)  }, [historial])

  // ── Acciones ────────────────────────────────────────────────────
  const agregarPedido = useCallback((pedido) => {
    const nuevoPedido = { ...pedido, id: Date.now(), coords: null }
    setPedidos((prev) => [...prev, nuevoPedido])
    return nuevoPedido.id
  }, [])

  const eliminarPedido = useCallback((id) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const limpiarPedidos = useCallback(() => setPedidos([]), [])

  const setRutaActiva = useCallback((ruta) => {
    setRutaActivaState(ruta)
    if (ruta) {
      const entrada = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        totalParadas: ruta.paradas.length,
        distanciaTotal: ruta.summary?.distance,
        duracionTotal: ruta.summary?.duration,
        paradas: ruta.paradas.map((p) => ({ nombre: p.nombre, direccion: p.direccion })),
      }
      setHistorialState((prev) => [entrada, ...prev].slice(0, 30))
    }
  }, [])

  const marcarEntregado = useCallback((id) => {
    setPedidoEntregado((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const limpiarRutaActiva = useCallback(() => {
    setRutaActivaState(null)
    setPedidoEntregado({})
    writeJSON(STORAGE_KEYS.RUTA_ACTIVA, null)
  }, [])

  const limpiarHistorial = useCallback(() => {
    setHistorialState([])
    writeJSON(STORAGE_KEYS.HISTORIAL, [])
  }, [])

  return {
    almacen: ALMACEN_FIJO,   // siempre las coords fijas
    pedidos, agregarPedido, eliminarPedido, limpiarPedidos,
    rutaActiva, setRutaActiva, limpiarRutaActiva,
    historial, limpiarHistorial,
    pedidoEntregado, marcarEntregado,
  }
}
