import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  })
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

  const onChange = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.phoneNumber.trim() || !form.password || !form.confirmPassword) {
      setError('All fields are required')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Confirm password does not match')
      return
    }

    const phonePattern = /^\+?[0-9]{10,15}$/
    if (!phonePattern.test(form.phoneNumber.trim())) {
      setError('Phone number must be 10 to 15 digits')
      return
    }

    try {
      setLoading(true)
      await register({
        role: 'admin',
        username: form.username.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword
      })
      navigate('/dashboard')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">Blue Admin</p>
        <h1>Create Account</h1>
        <p className="auth-subtitle">Admin registration with username, phone number, and password</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              placeholder="Choose username"
              value={form.username}
              onChange={(event) => onChange('username', event.target.value)}
            />
          </label>

          <label>
            Phone Number
            <input
              type="text"
              placeholder="9876543210"
              value={form.phoneNumber}
              onChange={(event) => onChange('phoneNumber', event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(event) => onChange('password', event.target.value)}
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(event) => onChange('confirmPassword', event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
