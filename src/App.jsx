import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login          from './components/Login'
import TabDirectorio  from './components/TabDirectorio'
import TabArmarRuta   from './components/TabArmarRuta'
import TabMisRutas    from './components/TabMisRutas'
import Toast          from './components/Toast'
import logoUrl        from './assets/equipototalsvg.svg'
import { Users, Route, Truck, LogOut, Loader } from 'lucide-react'

const TABS = {
  DIRECTORIO:  'directorio',
  ARMAR_RUTA:  'armar',
  MIS_RUTAS:   'rutas',
}

export default function App() {
  const [tab,     setTab]     = useState(TABS.MIS_RUTAS)
  const [usuario, setUsuario] = useState(undefined) // undefined = cargando
  const [toast,   setToast]   = useState({ message: '', type: 'info' })

  // Escuchar estado de autenticaciÃ³n
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUsuario(user ?? null))
    return unsub
  }, [])

  const handleSignOut = async () => {
    await signOut(auth)
    setToast({ message: 'SesiÃ³n cerrada.', type: 'info' })
  }

  // â”€â”€ Pantalla de carga inicial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (usuario === undefined) return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <Loader size={32} className="spin" color="var(--color-accent)" />
    </div>
  )

  // â”€â”€ Pantalla de login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!usuario) return <Login />

  // â”€â”€ App principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="app-shell">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="app-header">
        <img
          src={logoUrl}
          alt="Equipo Total"
          style={{ width: 95, height: 'auto', flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div className="header-title">
            <span>Equipo</span> Total
          </div>
          <div className="header-subtitle" style={{ fontSize: '0.65rem' }}>
            {usuario.email}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title="Cerrar sesiÃ³n"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8,
            cursor: 'pointer',
            padding: '7px 10px',
            color: '#ef4444',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.72rem', fontWeight: 700,
          }}
        >
          <LogOut size={14} /> Salir
        </button>
      </header>

      {/* â”€â”€ Tab Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav className="tab-nav" role="tablist" aria-label="NavegaciÃ³n principal">
        <button
          role="tab"
          className={`tab-btn ${tab === TABS.DIRECTORIO ? 'active' : ''}`}
          onClick={() => setTab(TABS.DIRECTORIO)}
          aria-selected={tab === TABS.DIRECTORIO}
          id="tab-directorio"
        >
          <Users size={18} />
          Directorio
        </button>

        <button
          role="tab"
          className={`tab-btn ${tab === TABS.ARMAR_RUTA ? 'active' : ''}`}
          onClick={() => setTab(TABS.ARMAR_RUTA)}
          aria-selected={tab === TABS.ARMAR_RUTA}
          id="tab-armar-ruta"
        >
          <Route size={18} />
          Armar Ruta
        </button>

        <button
          role="tab"
          className={`tab-btn ${tab === TABS.MIS_RUTAS ? 'active' : ''}`}
          onClick={() => setTab(TABS.MIS_RUTAS)}
          aria-selected={tab === TABS.MIS_RUTAS}
          id="tab-mis-rutas"
        >
          <Truck size={18} />
          Mis Rutas
        </button>
      </nav>

      {/* â”€â”€ Contenido â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="main-content" id="main-content">

        {tab === TABS.DIRECTORIO && (
          <section className="card" aria-label="Directorio de clientes">
            <div className="card-header">
              <Users size={16} /> Directorio de Clientes
            </div>
            <TabDirectorio />
          </section>
        )}

        {tab === TABS.ARMAR_RUTA && (
          <section className="card" aria-label="Armar ruta">
            <div className="card-header">
              <Route size={16} /> Armar Ruta del Dia
            </div>
            <TabArmarRuta />
          </section>
        )}

        {tab === TABS.MIS_RUTAS && (
          <TabMisRutas />
        )}

      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  )
}

