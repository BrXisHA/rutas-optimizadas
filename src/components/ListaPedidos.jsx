import { Trash2, Navigation, Map, CheckCircle, Circle, AlertTriangle } from 'lucide-react'
import { wazeUrl, googleMapsUrl } from '../utils/api'

function PedidoItemPendiente({ pedido, onEliminar, index }) {
  return (
    <div className={`pedido-item ${pedido.isUrgent ? 'urgent' : ''}`}>
      <div className="pedido-header">
        <div className={`pedido-number ${pedido.isUrgent ? 'urgent' : ''}`}>
          {index + 1}
        </div>
        <div className="pedido-info">
          <div className="pedido-nombre">{pedido.nombre}</div>
          <div className="pedido-direccion">{pedido.direccion}</div>
        </div>
        {pedido.isUrgent && <div className="urgency-badge">🔥 URGENTE</div>}
        <button
          className="btn btn-danger btn-icon"
          onClick={() => onEliminar(pedido.id)}
          aria-label={`Eliminar ${pedido.nombre}`}
          id={`btn-eliminar-${pedido.id}`}
          title="Eliminar pedido"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function PedidoItemRuta({ parada, posicion, entregado, onMarcarEntregado }) {
  if (!parada.coords) return null
  const [lon, lat] = parada.coords

  return (
    <div
      className={`pedido-item ${parada.isUrgent ? 'urgent' : ''}`}
      style={{ opacity: entregado ? 0.55 : 1 }}
    >
      <div className="pedido-header">
        <div className={`pedido-number ${parada.isUrgent ? 'urgent' : ''}`}>
          {posicion}
        </div>
        <div className="pedido-info">
          <div
            className="pedido-nombre"
            style={{ textDecoration: entregado ? 'line-through' : 'none' }}
          >
            {parada.nombre}
          </div>
          <div className="pedido-direccion">{parada.direccion}</div>
        </div>
        {parada.isUrgent && !entregado && <div className="urgency-badge">🔥</div>}
        <button
          className={`btn btn-icon ${entregado ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => onMarcarEntregado(parada.id)}
          aria-label={entregado ? 'Marcar como pendiente' : 'Marcar como entregado'}
          id={`btn-entregado-${parada.id}`}
          title={entregado ? 'Marcar pendiente' : 'Marcar entregado'}
        >
          {entregado
            ? <CheckCircle size={16} color="var(--color-success)" />
            : <Circle size={16} color="var(--color-muted)" />
          }
        </button>
      </div>

      {/* Botones de navegación */}
      {!entregado && (
        <div className="pedido-actions">
          <a
            href={wazeUrl(lat, lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-waze"
            id={`btn-waze-${parada.id}`}
            aria-label={`Navegar con Waze a ${parada.nombre}`}
          >
            <Navigation size={12} />
            Waze
          </a>
          <a
            href={googleMapsUrl(lat, lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gmaps"
            id={`btn-gmaps-${parada.id}`}
            aria-label={`Navegar con Google Maps a ${parada.nombre}`}
          >
            <Map size={12} />
            Maps
          </a>
        </div>
      )}

      {entregado && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
          ✅ Entregado
        </div>
      )}
    </div>
  )
}

export function ListaPedidosPendientes({ pedidos, onEliminar }) {
  if (pedidos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <AlertTriangle size={26} color="var(--color-muted)" />
        </div>
        <div className="empty-state-title">Sin pedidos aún</div>
        <div className="empty-state-desc">
          Agrega al menos 2 pedidos usando el formulario de arriba para poder optimizar la ruta.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pedidos.map((p, i) => (
        <PedidoItemPendiente
          key={p.id}
          pedido={p}
          index={i}
          onEliminar={onEliminar}
        />
      ))}
    </div>
  )
}

export function ListaParadasRuta({ paradas, pedidoEntregado, onMarcarEntregado }) {
  if (!paradas || paradas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Map size={26} color="var(--color-muted)" />
        </div>
        <div className="empty-state-title">Ruta vacía</div>
        <div className="empty-state-desc">No hay paradas en la ruta activa.</div>
      </div>
    )
  }

  const entregados = paradas.filter((p) => pedidoEntregado[p.id]).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Barra de progreso */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4 }}>
          <span>Progreso de entregas</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
            {entregados}/{paradas.length}
          </span>
        </div>
        <div className="progress-bar-wrap">
          <div
            className="progress-bar-fill"
            style={{ width: `${(entregados / paradas.length) * 100}%` }}
          />
        </div>
      </div>

      {paradas.map((parada, idx) => (
        <PedidoItemRuta
          key={parada.id}
          parada={parada}
          posicion={idx + 1}
          entregado={!!pedidoEntregado[parada.id]}
          onMarcarEntregado={onMarcarEntregado}
        />
      ))}
    </div>
  )
}
