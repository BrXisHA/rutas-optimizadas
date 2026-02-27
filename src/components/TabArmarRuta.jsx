import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { optimizarRuta } from '../utils/nearestNeighbor'
import { Flame, CheckSquare, Square, Loader, Save, Search } from 'lucide-react'

const ALMACEN = { lat: 16.77146959206133, lng: -93.19299112393828 }

export default function TabArmarRuta() {
  const [clientes,      setClientes]      = useState([])
  const [seleccionados, setSeleccionados] = useState({})
  const [urgentes,      setUrgentes]      = useState({})
  const [guardando,     setGuardando]     = useState(false)
  const [cargando,      setCargando]      = useState(true)
  const [exito,         setExito]         = useState(false)
  const [busqueda,      setBusqueda]      = useState('')

  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('nombre'))
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return unsub
  }, [])

  const toggleSeleccion = (id) =>
    setSeleccionados((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (!next[id]) setUrgentes((u) => ({ ...u, [id]: false }))
      return next
    })

  const toggleUrgente = (id) =>
    setUrgentes((prev) => ({ ...prev, [id]: !prev[id] }))

  // Filtrar por busqueda
  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.direccion?.toLowerCase().includes(q)
    )
  })

  const clientesSeleccionados = clientes.filter((c) => seleccionados[c.id])
  const numSel = clientesSeleccionados.length

  const handleGenerarRuta = async () => {
    if (numSel === 0) return
    setGuardando(true)
    try {
      const paradasRaw = clientesSeleccionados.map((c) => ({
        clienteId: c.id,
        nombre:    c.nombre,
        direccion: c.direccion || '',
        lat:       c.lat,
        lng:       c.lng,
        isUrgente: !!urgentes[c.id],
        entregado: false,
      }))
      const paradasOrdenadas = optimizarRuta(ALMACEN, paradasRaw)
      await addDoc(collection(db, 'rutas'), {
        estado:     'pendiente',
        creadoEn:   serverTimestamp(),
        paradas:    paradasOrdenadas,
        almacenLat: ALMACEN.lat,
        almacenLng: ALMACEN.lng,
      })
      setSeleccionados({})
      setUrgentes({})
      setBusqueda('')
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-muted)' }}>
      <Loader size={22} className="spin" />
    </div>
  )

  if (clientes.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-title">Sin clientes en el directorio</div>
      <div className="empty-state-desc">
        Ve a la pestana <b>Directorio</b> y agrega clientes primero.
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Barra de busqueda */}
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--color-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          className="form-input"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
      </div>

      {/* Contador */}
      <div style={{
        fontSize: '0.8rem', color: 'var(--color-muted)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>
          {busqueda
            ? `${clientesFiltrados.length} resultado${clientesFiltrados.length !== 1 ? 's' : ''}`
            : 'Selecciona los clientes de hoy'}
        </span>
        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
          {numSel} seleccionado{numSel !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista de clientes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clientesFiltrados.length === 0 && busqueda ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 20, fontSize: '0.85rem' }}>
            Sin resultados para "{busqueda}"
          </div>
        ) : (
          clientesFiltrados.map((c) => {
            const esSel = !!seleccionados[c.id]
            const esUrg = !!urgentes[c.id]
            return (
              <div
                key={c.id}
                className={`pedido-item${esUrg ? ' urgent' : ''}`}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSeleccion(c.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 2, flexShrink: 0,
                      color: esSel ? 'var(--color-accent)' : 'var(--color-muted)',
                    }}
                  >
                    {esSel ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleSeleccion(c.id)}>
                    <div className="pedido-nombre">{c.nombre}</div>
                    {c.direccion && <div className="pedido-direccion">{c.direccion}</div>}
                  </div>

                  {/* Toggle urgente */}
                  {esSel && (
                    <button
                      onClick={() => toggleUrgente(c.id)}
                      style={{
                        background: esUrg ? 'var(--color-urgent)' : 'rgba(245,158,11,0.12)',
                        border: '1px solid',
                        borderColor: esUrg ? 'var(--color-urgent)' : 'rgba(245,158,11,0.3)',
                        borderRadius: 8, cursor: 'pointer',
                        padding: '5px 8px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.7rem', fontWeight: 700,
                        color: esUrg ? '#fff' : '#f59e0b',
                        flexShrink: 0, transition: 'all 0.2s',
                      }}
                    >
                      <Flame size={14} />
                      {esUrg ? 'URGENTE' : 'Urgente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Exito */}
      {exito && (
        <div className="status-box" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.4)' }}>
          <span className="status-text">Ruta guardada! El repartidor ya puede verla.</span>
        </div>
      )}

      {/* Boton generar */}
      <button
        className="btn btn-success"
        onClick={handleGenerarRuta}
        disabled={numSel === 0 || guardando}
        id="btn-generar-ruta"
        style={{ marginTop: 4 }}
      >
        {guardando
          ? <><Loader size={16} className="spin" /> Guardando ruta...</>
          : <><Save size={16} /> Generar y Guardar Ruta ({numSel})</>
        }
      </button>

      {numSel === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'center' }}>
          Palomea al menos 1 cliente para generar la ruta.
        </p>
      )}
    </div>
  )
}
