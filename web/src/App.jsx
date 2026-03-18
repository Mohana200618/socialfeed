import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import BorderAlertPage from './pages/BorderAlertPage'
import FishingZonePage from './pages/FishingZonePage'
import ClusterPage from './pages/ClusterPage'
import NewsAnalyzerPage from './pages/NewsAnalyzerPage'
import SocialFeedPage from './pages/SocialFeedPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import './styles/App.css'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/border-alert" element={<BorderAlertPage />} />
          <Route path="/fishing-zones" element={<FishingZonePage />} />
          <Route path="/clusters" element={<ClusterPage />} />
          <Route path="/news-analyzer" element={<NewsAnalyzerPage />} />
          <Route path="/social-feed" element={<SocialFeedPage />} />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
