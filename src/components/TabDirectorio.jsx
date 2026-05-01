import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { UserPlus, Trash2, MapPin, Loader, Save, X, Navigation, Hash } from 'lucide-react'

// Coordenadas del almacén (punto de inicio del pin por defecto)
const ALMACEN = { lat: 16.77146959206133, lng: -93.19299112393828 }

/* ───────────────────────────────── MAPA PIN-DROP ──────────────────── */
function MapaPinDrop({ lat, lng, onChange }) {
  const mapRef  = useRef(null)
  const mapInst = useRef(null)
  const pinRef  = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInst.current) return

    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    // Ícono personalizado rojo
    const iconoRojo = L.divIcon({
      html: `<div style="width:22px;height:22px;background:#0284c7;border:3px solid #38bdf8;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      className: '',
    })

    const marker = L.marker([lat, lng], { draggable: true, icon: iconoRojo }).addTo(map)
    marker.bindPopup('📍 Arrastra para ajustar').openPopup()

    marker.on('dragend', () => {
      const { lat: newLat, lng: newLng } = marker.getLatLng()
      onChange(newLat, newLng)
    })

    mapInst.current = map
    pinRef.current  = marker

    return () => {
      map.remove()
      mapInst.current = null
      pinRef.current  = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: 240, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
    />
  )
}

/* ───────────────────── FORMULARIO NUEVO CLIENTE ───────────────────── */
function FormNuevoCliente({ onCerrar }) {
  const [nombre,       setNombre]       = useState('')
  const [direccion,    setDireccion]    = useState('')
  const [lat,          setLat]          = useState(ALMACEN.lat)
  const [lng,          setLng]          = useState(ALMACEN.lng)
  const [guardando,    setGuardando]    = useState(false)
  const [leafletOk,    setLeafletOk]    = useState(false)
  const [obtenGPS,     setObtenGPS]     = useState(false)
  const [errorGPS,     setErrorGPS]     = useState('')
  const [coordsText,   setCoordsText]   = useState('')
  const [coordsError,  setCoordsError]  = useState('')
  const leafletReady = useRef(false)

  useEffect(() => {
    if (leafletReady.current) return
    if (window.L) { setLeafletOk(true); return }

    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { leafletReady.current = true; setLeafletOk(true) }
    document.head.appendChild(script)
  }, [])

  // --- GPS: obtener ubicación actual ---
  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      setErrorGPS('Tu dispositivo no soporta geolocalización.')
      return
    }
    setObtenGPS(true)
    setErrorGPS('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLat(newLat)
        setLng(newLng)
        setCoordsText(`${newLat}, ${newLng}`)
        setObtenGPS(false)
      },
      (err) => {
        setErrorGPS('No se pudo obtener la ubicación. Verifica los permisos.')
        setObtenGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // --- Coordenadas manuales (formato: lat, lng) ---
  const handleCoordsText = (val) => {
    setCoordsText(val)
    setCoordsError('')
    const match = val.trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
    if (match) {
      const newLat = parseFloat(match[1])
      const newLng = parseFloat(match[2])
      if (newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
        setLat(newLat)
        setLng(newLng)
      } else {
        setCoordsError('Coordenadas fuera de rango válido.')
      }
    } else if (val.trim() !== '') {
      setCoordsError('Formato inválido. Ej: 16.778727, -93.171785')
    }
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      await addDoc(collection(db, 'clientes'), {
        nombre:    nombre.trim(),
        direccion: direccion.trim(),
        lat, lng,
        creadoEn: serverTimestamp(),
      })
      onCerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--color-card)',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        padding: '24px 20px 32px',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        {/* Header del sheet */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-accent)' }}>
            <UserPlus size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Nuevo Cliente
          </span>
          <button
            onClick={onCerrar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre del cliente *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Tienda Don Carlos"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Referencia / Dirección</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Calle Morelos 45, esq. Hidalgo"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          {/* --- Ubicación actual (GPS) --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 0 }}>
              <Navigation size={13} /> Ubicación rápida
            </label>
            <button
              type="button"
              onClick={usarUbicacionActual}
              disabled={obtenGPS}
              id="btn-usar-ubicacion-actual"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: obtenGPS ? 'rgba(2,132,199,0.08)' : 'rgba(2,132,199,0.15)',
                border: '1px solid rgba(56,189,248,0.4)',
                borderRadius: 8,
                color: 'var(--color-accent)',
                padding: '9px 14px',
                fontWeight: 600, fontSize: '0.82rem',
                cursor: obtenGPS ? 'wait' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {obtenGPS
                ? <><Loader size={14} className="spin" /> Obteniendo ubicación…</>
                : <><Navigation size={14} /> Usar mi ubicación actual</>}
            </button>
            {errorGPS && (
              <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>⚠️ {errorGPS}</p>
            )}
          </div>

          {/* --- Ingresar coordenadas manuales --- */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Hash size={13} /> Coordenadas manuales
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: 16.778727, -93.171785"
              value={coordsText}
              onChange={(e) => handleCoordsText(e.target.value)}
              id="input-coords-manual"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            {coordsError ? (
              <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>⚠️ {coordsError}</p>
            ) : coordsText && !coordsError ? (
              <p style={{ fontSize: '0.68rem', color: 'var(--color-muted)', marginTop: 4 }}>✅ Coordenadas aplicadas al mapa</p>
            ) : null}
          </div>

          {/* --- Mapa pin-drop --- */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <MapPin size={13} /> Ajusta el pin en el mapa
            </label>
            {leafletOk ? (
              <>
                <MapaPinDrop lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln) }}/>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-muted)', marginTop: 6 }}>
                  📍 {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </>
            ) : (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                <Loader size={18} className="spin" style={{ marginRight: 8 }} /> Cargando mapa…
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={guardando} style={{ marginTop: 4 }}>
            {guardando ? <><Loader size={15} className="spin" /> Guardando…</> : <><Save size={15} /> Guardar Cliente</>}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────── TAB DIRECTORIO ───────────────────────────── */
export default function TabDirectorio() {
  const [clientes,      setClientes]      = useState([])
  const [cargando,      setCargando]      = useState(true)
  const [mostrarForm,   setMostrarForm]   = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('nombre'))
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return unsub
  }, [])

  const eliminarCliente = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return
    await deleteDoc(doc(db, 'clientes', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Botón agregar */}
      <button
        className="btn btn-primary"
        onClick={() => setMostrarForm(true)}
        id="btn-nuevo-cliente"
        style={{ gap: 8 }}
      >
        <UserPlus size={17} /> Nuevo Cliente
      </button>

      {/* Lista */}
      {cargando ? (
        <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 30 }}>
          <Loader size={20} className="spin" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><UserPlus size={28} color="var(--color-muted)" /></div>
          <div className="empty-state-title">Sin clientes aún</div>
          <div className="empty-state-desc">
            Agrega clientes al directorio para poder armar rutas.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientes.map((c, i) => (
            <div key={c.id} className="pedido-item">
              <div className="pedido-header">
                <div className="pedido-number">{i + 1}</div>
                <div className="pedido-info">
                  <div className="pedido-nombre">{c.nombre}</div>
                  {c.direccion && (
                    <div className="pedido-direccion">{c.direccion}</div>
                  )}
                  <div style={{ fontSize: '0.67rem', color: 'var(--color-muted)', marginTop: 2 }}>
                    📍 {c.lat?.toFixed(5)}, {c.lng?.toFixed(5)}
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-icon"
                  onClick={() => eliminarCliente(c.id)}
                  title="Eliminar cliente"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && <FormNuevoCliente onCerrar={() => setMostrarForm(false)} />}
    </div>
  )
}
