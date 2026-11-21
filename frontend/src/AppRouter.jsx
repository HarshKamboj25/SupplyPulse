import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import App from './App'
import Login from './pages/Login'
import SupplyPulseIntro from './components/common/SupplyPulseIntro'
import WorkspaceLaunchIntro from './components/common/WorkspaceLaunchIntro'

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading">
        <span className="auth-loading-mark">S.</span>
        <p>Restoring your workspace...</p>
      </div>
    )
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />
}

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  const isLaunchingWorkspace = location.pathname === '/login' &&
    sessionStorage.getItem('supplypulse_launching') === 'true'

  return isAuthenticated && !isLaunchingWorkspace
    ? <Navigate to="/" replace />
    : <Login />
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <>
          <SupplyPulseIntro />
          <Routes>
          <Route path="/login" element={<PublicRoute />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/workspace-launch" element={<WorkspaceLaunchIntro />} />
            <Route path="/*" element={<App />} />
          </Route>
          </Routes>
        </>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter


