import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <AlertCircle size={16} />,
  info:    <Info size={16} />,
}

export default function Toast({ message, type = 'info', onDismiss, duration = 3500 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className={`toast ${type}`} role="status" aria-live="polite" id="toast-notification">
      {ICONS[type]}
      <span>{message}</span>
    </div>
  )
}
