import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = Boolean(token)

  const enforceAdminOnly = (nextUser) => {
    if (!nextUser || nextUser.role === 'admin') {
      return nextUser
    }

    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    throw new Error('Website access is restricted to admin users only')
  }

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me')
      const nextUser = enforceAdminOnly(response.data.data)
      setUser(nextUser)
      return nextUser
    } catch (error) {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      if (!token) {
        if (mounted) setLoading(false)
        return
      }
      await fetchProfile()
      if (mounted) setLoading(false)
    }

    bootstrap()

    return () => {
      mounted = false
    }
  }, [token])

  const login = async ({ identifier, password }) => {
    const response = await api.post('/auth/login', { identifier, password })
    const nextUser = enforceAdminOnly(response.data.data.user)
    const nextToken = response.data.data.token
    localStorage.setItem('token', nextToken)
    setToken(nextToken)
    setUser(nextUser)
    return nextUser
  }

  const register = async ({ username, phoneNumber, password, confirmPassword, role }) => {
    const response = await api.post('/auth/register', {
      username,
      phoneNumber,
      password,
      confirmPassword,
      role
    })
    const nextUser = enforceAdminOnly(response.data.data.user)
    const nextToken = response.data.data.token
    localStorage.setItem('token', nextToken)
    setToken(nextToken)
    setUser(nextUser)
    return nextUser
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile: fetchProfile
  }), [token, user, loading, isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
