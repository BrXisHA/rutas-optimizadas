import { Clock, MapPin, Truck, Trash2, Package } from 'lucide-react'
import { formatDistance, formatDuration } from '../utils/api'

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function Historial({ historial, onLimpiar }) {
  if (historial.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Clock size={26} color="var(--color-muted)" />
        </div>
        <div className="empty-state-title">Sin historial</div>
        <div className="empty-state-desc">
          Las rutas optimizadas aparecerán aquí automáticamente.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {historial.length} ruta{historial.length !== 1 ? 's' : ''} registrada{historial.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn btn-danger"
          onClick={onLimpiar}
          id="btn-limpiar-historial"
        >
          <Trash2 size={13} /> Limpiar
        </button>
      </div>

      {historial.map((entrada) => (
        <div key={entrada.id} className="history-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={15} color="var(--color-accent)" />
              <span className="history-stops">
                {entrada.totalParadas} parada{entrada.totalParadas !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="history-date">{formatFecha(entrada.fecha)}</span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {entrada.distanciaTotal != null && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                <MapPin size={12} />
                {formatDistance(entrada.distanciaTotal)}
              </span>
            )}
            {entrada.duracionTotal != null && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                <Clock size={12} />
                {formatDuration(entrada.duracionTotal)}
              </span>
            )}
          </div>

          {entrada.paradas && entrada.paradas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {entrada.paradas.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '0.75rem', color: 'var(--color-muted)' }}
                >
                  <Package size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span><b style={{ color: 'var(--color-text)' }}>{p.nombre}</b> — {p.direccion}</span>
                </div>
              ))}
              {entrada.paradas.length > 3 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginLeft: 17 }}>
                  +{entrada.paradas.length - 3} más…
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
