import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextData {
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: toast.type === 'success' ? 'rgba(45,106,79,0.95)' : 'rgba(139,32,32,0.95)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: 'var(--shadow-elevated)',
            animation: 'scaleIn 200ms ease',
            minWidth: 280,
            maxWidth: 420,
          }}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{
              background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, opacity: 0.7
            }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
