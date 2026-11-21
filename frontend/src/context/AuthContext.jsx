import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    sessionStorage.removeItem('supplypulse_token')
    setUser(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const token = sessionStorage.getItem('supplypulse_token')

      if (!token) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me')

        if (isMounted) {
          setUser(response.data.user)
        }
      } catch (error) {
        if (error.response?.status === 401) {
          sessionStorage.removeItem('supplypulse_token')
        }

        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    const { token, user: authenticatedUser } = response.data

    if (!token || !authenticatedUser) {
      throw new Error('Invalid login response from server.')
    }

    sessionStorage.setItem('supplypulse_token', token)
    setUser(authenticatedUser)

    return authenticatedUser
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
