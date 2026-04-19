import axios from 'axios'

const PATIENT_AUTH_EVENT = 'patient-auth-changed'
const APP_AUTH_EVENT = 'app-auth-changed'

function notifyAuthChange(eventName: string) {
  window.dispatchEvent(new CustomEvent(eventName))
}

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://api.psicologiaeexistir.com.br/api' : 'http://localhost:3333/api'),
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercept to add token if exists (don't overwrite if already set, e.g. patient token)
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('@Consultorio:token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Intercept 401 responses to clear session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isPatientRequest = error.config.url?.includes('/public/patients')
      
      if (isPatientRequest) {
        localStorage.removeItem('patient_token')
        localStorage.removeItem('patient_user')
        notifyAuthChange(PATIENT_AUTH_EVENT)
      } else {
        localStorage.removeItem('@Consultorio:token')
        localStorage.removeItem('@Consultorio:user')
        notifyAuthChange(APP_AUTH_EVENT)
      }
      
      const publicPaths = ['/', '/servicos', '/profissionais', '/sobre', '/trabalhe-conosco', '/agendar', '/minhas-consultas', '/login']
      const isPublicPath = publicPaths.includes(window.location.pathname)
      
      if (!isPublicPath && !isPatientRequest) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
