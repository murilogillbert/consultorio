import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'RECEPTIONIST' | 'PROFESSIONAL' | 'PATIENT'
  avatarUrl?: string
}

interface AuthContextData {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

const STORAGE_TOKEN_KEY = '@Consultorio:token'
const STORAGE_USER_KEY = '@Consultorio:user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY)
  })

  const isAuthenticated = !!token && !!user

  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { email, password })
    const { user: userData, token: tokenData } = response.data

    localStorage.setItem(STORAGE_TOKEN_KEY, tokenData)
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData))

    setUser(userData)
    setToken(tokenData)

    return userData
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    localStorage.removeItem(STORAGE_USER_KEY)
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context || Object.keys(context).length === 0) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
