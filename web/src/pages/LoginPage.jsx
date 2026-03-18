import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const getApiErrorMessage = (apiError, fallback) => {
    const payload = apiError?.response?.data
    if (payload?.error) return payload.error
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors[0].msg || fallback
    }
    return fallback
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError('Enter username or phone number and password')
      return
    }

    try {
      setLoading(true)
      await login({ identifier: identifier.trim(), password })
      navigate('/dashboard')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">Blue Admin</p>
        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Login with username or phone number</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username or Phone Number
            <input
              type="text"
              placeholder="admin or 9876543210"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          New admin? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
