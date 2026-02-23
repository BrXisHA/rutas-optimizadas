import { useState, useCallback } from 'react'
import {
  Truck, Package, Map, History,
  Zap, RotateCcw, Loader,
  Clock, Navigation2
} from 'lucide-react'

import { useAppState }             from './hooks/useAppState'
import { geocodeAddress, delay, optimizeRoute, formatDistance, formatDuration } from './utils/api'
import FormPedido                  from './components/FormPedido'
import { ListaPedidosPendientes, ListaParadasRuta } from './components/ListaPedidos'
import RouteMap                    from './components/RouteMap'
import Historial                   from './components/Historial'
import Toast                       from './components/Toast'

// ─── Tab IDs ──────────────────────────────────────────────────────
const TABS = {
  PEDIDOS:   'pedidos',
  RUTA:      'ruta',
  HISTORIAL: 'historial',
}

export default function App() {
  const [tab, setTab] = useState(TABS.PEDIDOS)
  const [toast, setToast] = useState({ message: '', type: 'info' })

  // ── Estado de optimización ─────────────────────────────────────
  const [optimizando, setOptimizando]     = useState(false)
  const [progresoMsg, setProgresoMsg]     = useState('')
  const [progresoNum, setProgresoNum]     = useState(0) // 0-100

  const {
    almacen,
    pedidos, agregarPedido, eliminarPedido, limpiarPedidos,
    rutaActiva, setRutaActiva, limpiarRutaActiva,
    historial, limpiarHistorial,
    pedidoEntregado, marcarEntregado,
  } = useAppState()

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  // ── Agregar pedido ─────────────────────────────────────────────
  const handleAgregarPedido = useCallback((datos) => {
    agregarPedido(datos)
    showToast(`📦 ${datos.nombre} agregado${datos.isUrgent ? ' (🔥 URGENTE)' : ''}`, 'success')
  }, [agregarPedido, showToast])

  // ─────────────────────────────────────────────────────────────────
  // OPTIMIZAR RUTA — lógica asíncrona principal
  // 1. Geocodifica cada dirección (Nominatim + 1s delay entre calls)
  // 2. Llama a ORS Optimization
  // 3. Reconstruye el arreglo ordenado y lo guarda en estado
  // ─────────────────────────────────────────────────────────────────
  const handleOptimizar = useCallback(async () => {
    if (pedidos.length < 1) {
      return showToast('Agrega al menos 1 pedido para optimizar.', 'error')
    }
    if (!almacen.coords) {
      return showToast('⚠️ Primero configura y guarda la dirección del almacén.', 'error')
    }

    setOptimizando(true)
    setProgresoMsg('Iniciando geocodificación…')
    setProgresoNum(0)

    try {
      // ── Paso 1: Geocodificar ──────────────────────────────────
      const pedidosGeoc = []
      for (let i = 0; i < pedidos.length; i++) {
        const p = pedidos[i]
        const pct = Math.round(((i) / pedidos.length) * 60)
        setProgresoNum(pct)
        setProgresoMsg(`Geocodificando ${i + 1}/${pedidos.length}: ${p.nombre}…`)

        const coords = await geocodeAddress(p.direccion)
        if (!coords) {
          showToast(`⚠️ No se encontraron coords para "${p.nombre}". Revisa la dirección.`, 'error')
          setOptimizando(false)
          return
        }

        pedidosGeoc.push({ ...p, coords })

        // Delay obligatorio entre llamadas a Nominatim (≥1 segundo)
        if (i < pedidos.length - 1) await delay(1100)
      }

      // ── Paso 2: Optimizar con ORS ─────────────────────────────
      setProgresoNum(65)
      setProgresoMsg('Calculando ruta óptima con ORS…')

      const stopsForORS = pedidosGeoc.map((p) => ({
        id: p.id,
        coords: p.coords,
        isUrgent: p.isUrgent,
      }))

      const { orderedIds, geometry, summary } = await optimizeRoute(
        stopsForORS,
        almacen.coords
      )

      // ── Paso 3: Reconstruir arreglo ordenado ──────────────────
      setProgresoNum(90)
      setProgresoMsg('Construyendo ruta final…')

      // ORS devuelve enteros en orderedIds. Usamos Math.floor como clave
      // para que la búsqueda coincida sin importar si el ID es float/int.
      const mapaById = Object.fromEntries(
        pedidosGeoc.map((p) => [Math.floor(p.id), p])
      )

      // ORS puede omitir IDs si no puede rutear; los ponemos al final
      const paradasOrdenadas = [
        ...orderedIds.map((id) => mapaById[Math.floor(id)]).filter(Boolean),
        ...pedidosGeoc.filter((p) => !orderedIds.includes(Math.floor(p.id))),
      ]

      const nuevaRuta = {
        id: Date.now(),
        fechaCreacion: new Date().toISOString(),
        paradas: paradasOrdenadas,
        geometry,
        summary,
      }

      setRutaActiva(nuevaRuta)
      limpiarPedidos()
      setProgresoNum(100)
      showToast(`✅ Ruta optimizada con ${paradasOrdenadas.length} paradas`, 'success')
      setTab(TABS.RUTA) // Ir a la pestaña de ruta
    } catch (err) {
      console.error(err)
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setOptimizando(false)
      setProgresoMsg('')
      setProgresoNum(0)
    }
  }, [pedidos, almacen, setRutaActiva, limpiarPedidos, showToast])

  // ── Limpiar ruta ───────────────────────────────────────────────
  const handleLimpiarRuta = useCallback(() => {
    limpiarRutaActiva()
    showToast('Ruta eliminada. Puedes agregar nuevos pedidos.', 'info')
    setTab(TABS.PEDIDOS)
  }, [limpiarRutaActiva, showToast])

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="app-header">
        {/* Logo Equipo Total */}
        <img
          src="/logo-equipo-total.png"
          alt="Equipo Total"
          style={{
            height: 42,
            width: 'auto',
            borderRadius: 8,
            flexShrink: 0,
            filter: 'drop-shadow(0 0 8px rgba(248,113,113,0.3))',
          }}
        />
        <div>
          <div className="header-title">
            <span>Equipo</span> Total
          </div>
          <div className="header-subtitle">Optimización de rutas · PWA</div>
        </div>
        <div className="header-badge" title="Coordenadas del almacén fijadas">
          🏭 Almacén listo
        </div>
      </header>

      {/* ── Tab Navigation ───────────────────────────────────────── */}
      <nav className="tab-nav" role="tablist" aria-label="Navegación principal">
        <button
          role="tab"
          className={`tab-btn ${tab === TABS.PEDIDOS ? 'active' : ''}`}
          onClick={() => setTab(TABS.PEDIDOS)}
          aria-selected={tab === TABS.PEDIDOS}
          id="tab-pedidos"
        >
          <Package size={18} />
          Pedidos
          {pedidos.length > 0 && (
            <span style={{
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '0.65rem',
              fontWeight: 800,
              lineHeight: '1.4',
            }}>
              {pedidos.length}
            </span>
          )}
        </button>

        <button
          role="tab"
          className={`tab-btn ${tab === TABS.RUTA ? 'active' : ''}`}
          onClick={() => setTab(TABS.RUTA)}
          aria-selected={tab === TABS.RUTA}
          id="tab-ruta"
        >
          <Map size={18} />
          Ruta
          {rutaActiva && (
            <span style={{
              background: 'var(--color-success)',
              color: 'white',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '0.65rem',
              fontWeight: 800,
              lineHeight: '1.4',
            }}>
              ✓
            </span>
          )}
        </button>

        <button
          role="tab"
          className={`tab-btn ${tab === TABS.HISTORIAL ? 'active' : ''}`}
          onClick={() => setTab(TABS.HISTORIAL)}
          aria-selected={tab === TABS.HISTORIAL}
          id="tab-historial"
        >
          <History size={18} />
          Historial
        </button>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="main-content" id="main-content">

        {/* ════════ TAB: PEDIDOS ════════════════════════════════ */}
        {tab === TABS.PEDIDOS && (
          <>
            {/* Formulario agregar pedido */}
            <section className="card" aria-label="Agregar pedido">
              <div className="card-header">
                <Package size={16} />
                Nuevo pedido
              </div>
              <FormPedido onAgregar={handleAgregarPedido} />
            </section>

            {/* Lista de pedidos pendientes */}
            {pedidos.length > 0 && (
              <section className="card" aria-label="Lista de pedidos">
                <div className="card-header">
                  <Truck size={16} />
                  Cola de entregas ({pedidos.length})
                </div>
                <ListaPedidosPendientes
                  pedidos={pedidos}
                  onEliminar={eliminarPedido}
                />
              </section>
            )}

            {/* Progreso de geocodificación */}
            {optimizando && (
              <div className="card status-box info" style={{ flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Loader size={18} className="spin" color="var(--color-accent)" />
                  <span className="status-text">{progresoMsg}</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${progresoNum}%` }} />
                </div>
              </div>
            )}

            {/* Botón optimizar */}
            <button
              className="btn btn-success"
              onClick={handleOptimizar}
              disabled={optimizando || pedidos.length === 0}
              id="btn-optimizar-ruta"
              aria-label="Optimizar ruta"
            >
              {optimizando
                ? <><Loader size={17} className="spin" /> Optimizando ruta…</>
                : <><Zap size={17} /> Optimizar ruta ({pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''})</>
              }
            </button>

            {pedidos.length === 0 && !optimizando && (
              <div className="status-box info">
                <span className="status-text" style={{ fontSize: '0.78rem' }}>
                  ¡Agrega al menos 1 pedido para continuar!
                </span>
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: RUTA ══════════════════════════════════ */}
        {tab === TABS.RUTA && (
          <>
            {rutaActiva ? (
              <>
                {/* Estadísticas */}
                <div className="stats-row">
                  <div className="stat-item">
                    <div className="stat-value">{rutaActiva.paradas.length}</div>
                    <div className="stat-label">Paradas</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {formatDistance(rutaActiva.summary?.distance)}
                    </div>
                    <div className="stat-label">Distancia</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {formatDuration(rutaActiva.summary?.duration)}
                    </div>
                    <div className="stat-label">Tiempo est.</div>
                  </div>
                </div>

                {/* Mapa */}
                <section className="card" style={{ padding: 0, overflow: 'hidden' }} aria-label="Mapa de la ruta">
                  <RouteMap
                    rutaActiva={rutaActiva}
                    almacenCoords={almacen.coords}
                  />
                </section>

                {/* Lista de paradas */}
                <section className="card" aria-label="Paradas de la ruta">
                  <div className="card-header">
                    <Navigation2 size={16} />
                    Orden de entregas
                  </div>
                  <ListaParadasRuta
                    paradas={rutaActiva.paradas}
                    pedidoEntregado={pedidoEntregado}
                    onMarcarEntregado={marcarEntregado}
                  />
                </section>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setTab(TABS.PEDIDOS)
                    }}
                    id="btn-agregar-mas"
                  >
                    <Package size={15} />
                    Agregar más
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleLimpiarRuta}
                    id="btn-limpiar-ruta"
                  >
                    <RotateCcw size={15} />
                    Nueva ruta
                  </button>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-muted)', paddingBottom: 8 }}>
                  Creada el {new Date(rutaActiva.fechaCreacion).toLocaleString('es-MX')}
                </div>
              </>
            ) : (
              <div className="empty-state fade-in">
                <div className="empty-state-icon">
                  <Map size={30} color="var(--color-muted)" />
                </div>
                <div className="empty-state-title">Sin ruta activa</div>
                <div className="empty-state-desc">
                  Ve a la pestaña <b>Pedidos</b>, agrega las entregas del día y presiona{' '}
                  <b>Optimizar ruta</b>.
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 8 }}
                  onClick={() => setTab(TABS.PEDIDOS)}
                  id="btn-ir-pedidos"
                >
                  <Package size={15} />
                  Ir a Pedidos
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: HISTORIAL ═════════════════════════════ */}
        {tab === TABS.HISTORIAL && (
          <>
            <section className="card" aria-label="Historial de rutas">
              <div className="card-header">
                <Clock size={16} />
                Historial de rutas
              </div>
              <Historial
                historial={historial}
                onLimpiar={limpiarHistorial}
              />
            </section>

            {historial.length > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                El historial se guarda localmente en tu dispositivo.
              </div>
            )}
          </>
        )}

      </main>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      <Toast
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  )
}
