import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  MapPin, CheckCircle, Circle, Navigation,
  Play, Clock, Loader,
} from 'lucide-react'

/* ───────────── Tarjeta de parada individual ──────────────────────── */
function TarjetaParada({ parada, index, onEntregado }) {
  const { nombre, direccion, lat, lng, isUrgente, entregado } = parada

  const abrirWaze = () => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')
  }
  const abrirMaps = () => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')
  }

  return (
    <div
      className={`pedido-item${isUrgente ? ' urgent' : ''}`}
      style={{ opacity: entregado ? 0.5 : 1, transition: 'opacity 0.3s' }}
    >
      <div className="pedido-header">
        <div className={`pedido-number${isUrgente ? ' urgent' : ''}`}>{index + 1}</div>
        <div className="pedido-info" style={{ textDecoration: entregado ? 'line-through' : 'none' }}>
          <div className="pedido-nombre">{nombre}</div>
          {direccion && <div className="pedido-direccion">{direccion}</div>}
          <div style={{ fontSize: '0.67rem', color: 'var(--color-muted)', marginTop: 2 }}>
            📍 {lat?.toFixed(5)}, {lng?.toFixed(5)}
          </div>
        </div>
        {isUrgente && (
          <span className="urgency-badge">🔥 URGENTE</span>
        )}
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
            flex: 1,
            background: entregado ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid',
            borderColor: entregado ? 'rgba(16,185,129,0.4)' : 'var(--color-border)',
            color: entregado ? 'var(--color-success)' : 'var(--color-text)',
            fontSize: '0.78rem',
            padding: '7px 10px',
          }}
        >
          {entregado
            ? <><CheckCircle size={14} /> Entregado</>
            : <><Circle size={14} /> Marcar entregado</>
          }
        </button>
      </div>
    </div>
  )
}

/* ────────────────── Tarjeta de ruta pendiente ────────────────────── */
function TarjetaRutaPendiente({ ruta, onIniciar }) {
  const fecha = ruta.creadoEn?.toDate?.()?.toLocaleString('es-MX') ?? '...'
  const total = ruta.paradas?.length ?? 0
  const urgentes = ruta.paradas?.filter((p) => p.isUrgente).length ?? 0

  return (
    <div className="history-item" style={{ gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
            Ruta del {fecha}
          </div>
          <div className="history-stops">
            {total} entrega{total !== 1 ? 's' : ''}
            {urgentes > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-urgent)' }}>· {urgentes} urgente{urgentes !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 20,
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)',
          color: '#f59e0b',
        }}>PENDIENTE</span>
      </div>

      {/* Vista previa de primeras 3 paradas */}
      {ruta.paradas?.slice(0, 3).map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', gap: 6 }}>
          <span>#{i + 1}</span>
          <span style={{ color: p.isUrgente ? 'var(--color-urgent)' : 'var(--color-text)' }}>{p.nombre}</span>
          {p.isUrgente && <span>🔥</span>}
        </div>
      ))}
      {total > 3 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>… y {total - 3} más</div>
      )}

      <button
        className="btn btn-success"
        onClick={() => onIniciar(ruta.id)}
        style={{ marginTop: 4, fontSize: '1rem', padding: '13px 20px' }}
        id={`btn-iniciar-ruta-${ruta.id}`}
      >
        <Play size={18} /> Iniciar Ruta
      </button>
    </div>
  )
}

/* ─────────────────────── TAB MIS RUTAS ──────────────────────────── */
export default function TabMisRutas() {
  const [rutas,    setRutas]    = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'rutas'),
      where('estado', 'in', ['pendiente', 'activa', 'completada'])
    )
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.creadoEn?.seconds ?? 0
          const tb = b.creadoEn?.seconds ?? 0
          return tb - ta // más reciente primero
        })
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
      <div className="empty-state-desc">
        El despachador aún no ha generado una ruta. Espera o ve a <b>Armar Ruta</b>.
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Ruta activa ─────────────────────────────────── */}
      {activas.map((ruta) => {
        const entregadas = ruta.paradas?.filter((p) => p.entregado).length ?? 0
        const total      = ruta.paradas?.length ?? 0
        const pct        = total > 0 ? Math.round((entregadas / total) * 100) : 0

        return (
          <div key={ruta.id}>
            {/* Progreso */}
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>🚚 Ruta EN CURSO</span>
                <span style={{ color: 'var(--color-success)' }}>{entregadas}/{total} entregas</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

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
                borderRadius: 'var(--radius-sm)', padding: '14px',
                fontWeight: 700, color: 'var(--color-success)',
              }}>
                🎉 ¡Todas las entregas completadas!
              </div>
            )}
          </div>
        )
      })}

      {/* ── Rutas pendientes ─────────────────────────────── */}
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

      {/* ── Completadas (historial breve) ────────────────── */}
      {completadas.length > 0 && (
        <div>
          <div className="card-header" style={{ marginBottom: 10, color: 'var(--color-muted)' }}>
            <CheckCircle size={16} /> Completadas recientes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completadas.map((r) => (
              <div key={r.id} className="history-item" style={{ opacity: 0.65 }}>
                <div className="history-date">
                  {r.creadoEn?.toDate?.()?.toLocaleString('es-MX')}
                </div>
                <div className="history-stops">
                  ✅ {r.paradas?.length} entregas completadas
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
