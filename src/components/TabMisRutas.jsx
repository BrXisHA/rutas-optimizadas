import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, query, where, onSnapshot,
  doc, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  MapPin, CheckCircle, Circle, Navigation,
  Play, Clock, Loader, Map as MapIcon, ChevronDown, ChevronUp,
} from 'lucide-react'

const ALMACEN = { lat: 16.77146959206133, lng: -93.19299112393828 }

/* ─── Mini mapa Leaflet para mostrar pines ───────────────────────── */
function MapaRuta({ paradas, almacen }) {
  const mapRef  = useRef(null)
  const mapInst = useRef(null)
  const [listo, setListo] = useState(false)

  // Cargar Leaflet dinamicamente
  useEffect(() => {
    if (window.L) { setListo(true); return }
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setListo(true)
    document.head.appendChild(script)
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!listo || !mapRef.current || mapInst.current) return
    const L = window.L
    mapInst.current = L.map(mapRef.current, {
      center: [almacen.lat, almacen.lng],
      zoom: 13,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OSM',
      maxZoom: 19,
    }).addTo(mapInst.current)
  }, [listo])

  // Dibujar pines cuando cambian las paradas
  useEffect(() => {
    if (!listo || !mapInst.current) return
    const L = window.L
    const map = mapInst.current

    // Limpiar capas previas (excepto tiles)
    map.eachLayer((l) => { if (l instanceof L.Marker) map.removeLayer(l) })

    const bounds = []

    // Pin del almacen
    const iconAlmacen = L.divIcon({
      html: `<div style="background:#0284c7;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.4);font-size:16px;">🏭</div>`,
      className: '', iconSize: [34, 34], iconAnchor: [17, 17],
    })
    L.marker([almacen.lat, almacen.lng], { icon: iconAlmacen })
      .addTo(map).bindPopup('<b>Almacen - Punto de inicio</b>')
    bounds.push([almacen.lat, almacen.lng])

    // Pines de paradas
    paradas?.forEach((p, i) => {
      if (!p.lat || !p.lng) return
      const esUrg = p.isUrgente
      const color = esUrg ? '#f59e0b' : (p.entregado ? '#10b981' : '#0284c7')
      const icon = L.divIcon({
        html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);color:white;font-weight:800;font-size:13px;${p.entregado ? 'opacity:0.6' : ''}">${i + 1}</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const popup = `<b>${esUrg ? '🔥 ' : ''}${p.nombre}</b>${p.direccion ? '<br><small>' + p.direccion + '</small>' : ''}${p.entregado ? '<br><span style="color:green">✅ Entregado</span>' : ''}`
      L.marker([p.lat, p.lng], { icon })
        .addTo(map).bindPopup(popup)
      bounds.push([p.lat, p.lng])
    })

    // Ajustar zoom para ver todos los pines
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
    }
  }, [listo, paradas])

  if (!listo) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
      <Loader size={18} className="spin" style={{ marginRight: 8 }} /> Cargando mapa...
    </div>
  )

  return (
    <div ref={mapRef} style={{ width: '100%', height: 220, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }} />
  )
}

/* ─── Tarjeta de parada individual ───────────────────────────────── */
function TarjetaParada({ parada, index, onEntregado }) {
  const { nombre, direccion, lat, lng, isUrgente, entregado } = parada

  const abrirWaze = () => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')
  const abrirMaps = () => window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')

  return (
    <div
      className={`pedido-item${isUrgente ? ' urgent' : ''}`}
      style={{ opacity: entregado ? 0.55 : 1, transition: 'opacity 0.3s' }}
    >
      <div className="pedido-header">
        <div className={`pedido-number${isUrgente ? ' urgent' : ''}`}>{index + 1}</div>
        <div className="pedido-info" style={{ textDecoration: entregado ? 'line-through' : 'none' }}>
          <div className="pedido-nombre">{nombre}</div>
          {direccion && <div className="pedido-direccion">{direccion}</div>}
          <div style={{ fontSize: '0.67rem', color: 'var(--color-muted)', marginTop: 2 }}>
            {lat?.toFixed(5)}, {lng?.toFixed(5)}
          </div>
        </div>
        {isUrgente && <span className="urgency-badge">🔥 URGENTE</span>}
      </div>
      <div className="pedido-actions">
        <button className="btn btn-waze" onClick={abrirWaze} disabled={entregado}>
          <Navigation size={14} /> Waze
        </button>
        <button className="btn btn-gmaps" onClick={abrirMaps} disabled={entregado}>
          <MapPin size={14} /> Maps
        </button>
        <button
          className="btn"
          onClick={onEntregado}
          style={{
            flex: 1, fontSize: '0.78rem', padding: '7px 10px',
            background: entregado ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid',
            borderColor: entregado ? 'rgba(16,185,129,0.4)' : 'var(--color-border)',
            color: entregado ? 'var(--color-success)' : 'var(--color-text)',
          }}
        >
          {entregado ? <><CheckCircle size={14} /> Entregado</> : <><Circle size={14} /> Marcar entregado</>}
        </button>
      </div>
    </div>
  )
}

/* ─── Tarjeta ruta pendiente ──────────────────────────────────────── */
function TarjetaRutaPendiente({ ruta, onIniciar }) {
  const fecha   = ruta.creadoEn?.toDate?.()?.toLocaleString('es-MX') ?? '...'
  const total   = ruta.paradas?.length ?? 0
  const urgentes = ruta.paradas?.filter((p) => p.isUrgente).length ?? 0
  const [verMapa, setVerMapa] = useState(false)

  return (
    <div className="history-item" style={{ gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
            {fecha}
          </div>
          <div className="history-stops">
            {total} entrega{total !== 1 ? 's' : ''}
            {urgentes > 0 && <span style={{ marginLeft: 8, color: 'var(--color-urgent)' }}>· {urgentes} urgente{urgentes !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 20,
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b',
        }}>PENDIENTE</span>
      </div>

      {/* Vista previa */}
      {ruta.paradas?.slice(0, 3).map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', gap: 6 }}>
          <span>#{i + 1}</span>
          <span style={{ color: p.isUrgente ? 'var(--color-urgent)' : 'var(--color-text)' }}>{p.nombre}</span>
          {p.isUrgente && <span>🔥</span>}
        </div>
      ))}
      {total > 3 && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>... y {total - 3} mas</div>}

      {/* Mapa colapsable */}
      <button
        onClick={() => setVerMapa((v) => !v)}
        style={{
          background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.25)',
          borderRadius: 8, cursor: 'pointer', padding: '6px 12px',
          color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
        }}
      >
        <MapIcon size={14} />
        {verMapa ? 'Ocultar mapa' : 'Ver mapa de entregas'}
        {verMapa ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {verMapa && (
        <MapaRuta
          paradas={ruta.paradas}
          almacen={{ lat: ruta.almacenLat ?? ALMACEN.lat, lng: ruta.almacenLng ?? ALMACEN.lng }}
        />
      )}

      <button
        className="btn btn-success"
        onClick={() => onIniciar(ruta.id)}
        style={{ marginTop: 2, fontSize: '1rem', padding: '12px 20px' }}
      >
        <Play size={18} /> Iniciar Ruta
      </button>
    </div>
  )
}

/* ─── TAB MIS RUTAS ──────────────────────────────────────────────── */
export default function TabMisRutas() {
  const [rutas,    setRutas]    = useState([])
  const [cargando, setCargando] = useState(true)
  const [mapasActivos, setMapasActivos] = useState({}) // { [rutaId]: bool }

  useEffect(() => {
    const q = query(
      collection(db, 'rutas'),
      where('estado', 'in', ['pendiente', 'activa', 'completada'])
    )
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0))
      setRutas(docs)
      setCargando(false)
    })
    return unsub
  }, [])

  const iniciarRuta = async (rutaId) => {
    await updateDoc(doc(db, 'rutas', rutaId), { estado: 'activa' })
  }

  const marcarEntregado = async (rutaId, paradas, index) => {
    const nuevasParadas = paradas.map((p, i) =>
      i === index ? { ...p, entregado: !p.entregado } : p
    )
    const todasEntregadas = nuevasParadas.every((p) => p.entregado)
    await updateDoc(doc(db, 'rutas', rutaId), {
      paradas: nuevasParadas,
      ...(todasEntregadas ? { estado: 'completada' } : {}),
    })
  }

  const toggleMapa = useCallback((id) =>
    setMapasActivos((prev) => ({ ...prev, [id]: !prev[id] })), [])

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-muted)' }}>
      <Loader size={22} className="spin" />
    </div>
  )

  const pendientes  = rutas.filter((r) => r.estado === 'pendiente')
  const activas     = rutas.filter((r) => r.estado === 'activa')
  const completadas = rutas.filter((r) => r.estado === 'completada').slice(0, 5)

  if (rutas.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon"><Clock size={30} color="var(--color-muted)" /></div>
      <div className="empty-state-title">Sin rutas asignadas</div>
      <div className="empty-state-desc">El despachador aun no ha generado una ruta.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Ruta activa ──────────────────────────────── */}
      {activas.map((ruta) => {
        const entregadas = ruta.paradas?.filter((p) => p.entregado).length ?? 0
        const total      = ruta.paradas?.length ?? 0
        const pct        = total > 0 ? Math.round((entregadas / total) * 100) : 0
        const mapaAbierto = !!mapasActivos[ruta.id]

        return (
          <div key={ruta.id}>
            {/* Progreso */}
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>🚚 Ruta EN CURSO</span>
                <span style={{ color: 'var(--color-success)' }}>{entregadas}/{total} entregas</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Boton mapa */}
            <button
              onClick={() => toggleMapa(ruta.id)}
              style={{
                background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.25)',
                borderRadius: 8, cursor: 'pointer', padding: '8px 14px',
                color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', justifyContent: 'center', marginBottom: 10,
              }}
            >
              <MapIcon size={15} />
              {mapaAbierto ? 'Ocultar mapa' : 'Ver mapa de entregas'}
              {mapaAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Mapa con pines */}
            {mapaAbierto && (
              <div style={{ marginBottom: 12 }}>
                <MapaRuta
                  paradas={ruta.paradas}
                  almacen={{ lat: ruta.almacenLat ?? ALMACEN.lat, lng: ruta.almacenLng ?? ALMACEN.lng }}
                />
              </div>
            )}

            {/* Paradas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ruta.paradas?.map((p, i) => (
                <TarjetaParada
                  key={i}
                  parada={p}
                  index={i}
                  onEntregado={() => marcarEntregado(ruta.id, ruta.paradas, i)}
                />
              ))}
            </div>

            {pct === 100 && (
              <div style={{
                marginTop: 14, textAlign: 'center',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: 'var(--radius-sm)', padding: 14,
                fontWeight: 700, color: 'var(--color-success)',
              }}>
                Todas las entregas completadas!
              </div>
            )}
          </div>
        )
      })}

      {/* ── Rutas pendientes ─────────────────────────── */}
      {pendientes.length > 0 && (
        <div>
          <div className="card-header" style={{ marginBottom: 10 }}>
            <Clock size={16} /> Rutas Pendientes ({pendientes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendientes.map((r) => (
              <TarjetaRutaPendiente key={r.id} ruta={r} onIniciar={iniciarRuta} />
            ))}
          </div>
        </div>
      )}

      {/* ── Completadas ───────────────────────────────── */}
      {completadas.length > 0 && (
        <div>
          <div className="card-header" style={{ marginBottom: 10, color: 'var(--color-muted)' }}>
            <CheckCircle size={16} /> Completadas recientes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completadas.map((r) => (
              <div key={r.id} className="history-item" style={{ opacity: 0.7 }}>
                <div className="history-date">{r.creadoEn?.toDate?.()?.toLocaleString('es-MX')}</div>
                <div className="history-stops">Entregadas: {r.paradas?.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
