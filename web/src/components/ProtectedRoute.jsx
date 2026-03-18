import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div className="screen-center">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
