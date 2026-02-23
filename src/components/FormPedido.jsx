import { useState } from 'react'
import { Zap, User, MapPin, X, Check } from 'lucide-react'

export default function FormPedido({ onAgregar }) {
  const [form, setForm] = useState({ nombre: '', direccion: '', isUrgent: false })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const toggleUrgente = () => {
    setForm((prev) => ({ ...prev, isUrgent: !prev.isUrgent }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const nombre    = form.nombre.trim()
    const direccion = form.direccion.trim()

    if (!nombre)    return setError('El nombre del cliente es obligatorio.')
    if (!direccion) return setError('La dirección es obligatoria.')

    onAgregar({ nombre, direccion, isUrgent: form.isUrgent })
    setForm({ nombre: '', direccion: '', isUrgent: false })
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Nombre */}
      <div className="form-group">
        <label htmlFor="pedido-nombre" className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={13} /> Cliente / Destinatario
          </span>
        </label>
        <input
          id="pedido-nombre"
          name="nombre"
          type="text"
          className="form-input"
          placeholder="Ej: Juan Pérez"
          value={form.nombre}
          onChange={handleChange}
          autoComplete="off"
          maxLength={80}
        />
      </div>

      {/* Dirección */}
      <div className="form-group">
        <label htmlFor="pedido-direccion" className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} /> Dirección completa
          </span>
        </label>
        <input
          id="pedido-direccion"
          name="direccion"
          type="text"
          className="form-input"
          placeholder="Ej: Av. Juárez 123, Col. Centro, Guadalajara, Jalisco"
          value={form.direccion}
          onChange={handleChange}
          autoComplete="off"
          maxLength={200}
        />
        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', lineHeight: 1.4 }}>
          💡 Incluye calle, número, colonia y ciudad para mejores resultados
        </span>
      </div>

      {/* Toggle urgente */}
      <div className="form-group">
        <label
          className={`urgency-toggle ${form.isUrgent ? 'active' : ''}`}
          onClick={toggleUrgente}
          htmlFor="pedido-urgente"
          style={{ cursor: 'pointer' }}
          id="toggle-urgente"
        >
          <div className="urgency-dot">
            {form.isUrgent && <Check size={12} color="white" strokeWidth={3} />}
          </div>
          <div>
            <div
              className="urgency-label"
              style={{ color: form.isUrgent ? 'var(--color-urgent)' : 'var(--color-text)' }}
            >
              🔥 Paquete Urgente
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: 1 }}>
              Se prioriza al inicio de la ruta (priority 100)
            </div>
          </div>
          <input id="pedido-urgente" type="checkbox" checked={form.isUrgent} readOnly />
        </label>
      </div>

      {/* Error */}
      {error && (
        <div
          className="status-box error"
          style={{ marginBottom: 12 }}
          role="alert"
        >
          <X size={16} color="#ef4444" />
          <span className="status-text" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        id="btn-agregar-pedido"
      >
        <Zap size={16} />
        Agregar a la ruta
      </button>
    </form>
  )
}
