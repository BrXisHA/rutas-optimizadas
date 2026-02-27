import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Truck, Mail, Lock, Loader, AlertCircle } from 'lucide-react'

export default function Login() {
  const [modo,      setModo]      = useState('login')  // 'login' | 'registro'
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState('')

  const mensajeError = (code) => {
    const map = {
      'auth/user-not-found':        'No existe una cuenta con ese correo.',
      'auth/wrong-password':        'Contraseña incorrecta.',
      'auth/invalid-credential':    'Correo o contraseña incorrectos.',
      'auth/email-already-in-use':  'Ese correo ya está registrado.',
      'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-email':         'El formato del correo no es válido.',
    }
    return map[code] || 'Ocurrió un error. Intenta de nuevo.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      if (modo === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(mensajeError(err.code))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '32px 28px',
        boxShadow: 'var(--shadow-glow)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/logo-equipo-total.png"
            alt="Equipo Total"
            style={{ height: 56, width: 'auto', borderRadius: 10, marginBottom: 12 }}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Sistema de Gestión Logística
          </div>
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          marginBottom: 20,
          textAlign: 'center',
          color: 'var(--color-text)',
        }}>
          {modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={13} /> Correo electrónico
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Contraseña */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Lock size={13} /> Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="status-box error" style={{ gap: 8 }}>
              <AlertCircle size={16} color="var(--color-danger)" />
              <span className="status-text" style={{ fontSize: '0.8rem' }}>{error}</span>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={cargando}
            style={{ marginTop: 4 }}
          >
            {cargando
              ? <><Loader size={16} className="spin" /> Cargando…</>
              : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {/* Cambiar modo */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--color-muted)',
          marginTop: 18,
        }}>
          {modo === 'login' ? '¿Sin cuenta aún? ' : '¿Ya tienes cuenta? '}
          <button
            onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'inherit',
              padding: 0,
            }}
          >
            {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
