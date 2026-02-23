import { useState } from 'react'
import { Settings, MapPin, Check, Loader } from 'lucide-react'
import { geocodeAddress } from '../utils/api'

export default function ConfigAlmacen({ almacen, onGuardar }) {
  const [direccion, setDireccion] = useState(almacen.direccion || '')
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const handleGuardar = async (e) => {
    e.preventDefault()
    const dir = direccion.trim()
    if (!dir) return setErrorMsg('Ingresa la dirección del almacén.')

    setStatus('loading')
    setErrorMsg('')

    try {
      const coords = await geocodeAddress(dir)
      if (!coords) {
        setStatus('error')
        setErrorMsg('No se encontraron coordenadas para esa dirección. Intenta ser más específico.')
        return
      }
      onGuardar({ direccion: dir, coords })
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setErrorMsg(`Error al geocodificar: ${err.message}`)
    }
  }

  return (
    <form onSubmit={handleGuardar} noValidate>
      <div className="form-group">
        <label htmlFor="almacen-direccion" className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} /> Dirección del almacén / punto de inicio
          </span>
        </label>
        <input
          id="almacen-direccion"
          type="text"
          className="form-input"
          placeholder="Ej: Calle Morelos 45, Guadalajara, Jalisco, México"
          value={direccion}
          onChange={(e) => {
            setDireccion(e.target.value)
            setStatus(null)
            setErrorMsg('')
          }}
          autoComplete="off"
          maxLength={250}
        />
      </div>

      {errorMsg && (
        <div className="status-box error" style={{ marginBottom: 12 }}>
          <span className="status-text" style={{ color: '#ef4444' }}>{errorMsg}</span>
        </div>
      )}

      {status === 'ok' && almacen.coords && (
        <div className="status-box" style={{ marginBottom: 12 }}>
          <Check size={16} color="var(--color-success)" />
          <span className="status-text">
            Almacén guardado. Coords: {almacen.coords[1].toFixed(5)}, {almacen.coords[0].toFixed(5)}
          </span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'loading'}
        id="btn-guardar-almacen"
      >
        {status === 'loading'
          ? <><Loader size={15} className="spin" /> Geocodificando…</>
          : <><Settings size={15} /> Guardar almacén</>
        }
      </button>
    </form>
  )
}
