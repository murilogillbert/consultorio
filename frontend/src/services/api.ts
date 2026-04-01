import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercept to add token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@Consultorio:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept 401 responses to clear session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@Consultorio:token')
      localStorage.removeItem('@Consultorio:user')
      
      const publicPaths = ['/', '/servicos', '/profissionais', '/sobre', '/trabalhe-conosco', '/agendar', '/login']
      const isPublicPath = publicPaths.includes(window.location.pathname)
      
      if (!isPublicPath) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
