import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Package,
  Truck,
  Warehouse,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function SupplyPulseLoginMark() {
  return (
    <svg
      className="login-heartbeat-mark"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 51H29L40 28L53 73L66 42L73 51H91"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      sessionStorage.setItem('supplypulse_launching', 'true')
      await login({ email: email.trim(), password })
      navigate('/workspace-launch', { replace: true, state: { fromLogin: true } })
    } catch (err) {
      sessionStorage.removeItem('supplypulse_launching')
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to sign in. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
<div className="login-brand">
          <span className="login-brand-icon">
            <SupplyPulseLoginMark />
          </span>
          <span className="login-wordmark"><span>SUPPLY</span><span className="login-wordmark-accent">PULSE</span><span className="login-brand-period">.</span></span>
        </div>

        <div className="login-brand-content">
          <span className="login-eyebrow">SUPPLY CHAIN INTELLIGENCE</span>
          <h1>See the signal.<br />Move with clarity.</h1>
          <p>
            Your operations, inventory and procurement intelligence,
            brought together in one connected workspace.
          </p>
        </div>

        <div className="login-brand-footer">
          <span className="login-footer-line" />
          <span>BUILT FOR BETTER OPERATIONS</span>
        </div>
      </section>

      <section className="login-form-panel">
                <div className="login-ambient-icons login-ambient-icons-right" aria-hidden="true">
          <span className="login-float-icon login-icon-one"><Package size={18} /></span>
          <span className="login-float-icon login-icon-two"><Truck size={19} /></span>
          <span className="login-float-icon login-icon-three"><Boxes size={20} /></span>
          <span className="login-float-icon login-icon-four"><Warehouse size={18} /></span>
          <span className="login-droplet-particle droplet-one" />
          <span className="login-droplet-particle droplet-two" />
          <span className="login-droplet-particle droplet-three" />
          <span className="login-droplet-particle droplet-four" />
          <span className="login-droplet-particle droplet-five" />
          <span className="login-droplet-particle droplet-six" />
          <span className="login-droplet-particle droplet-seven" />
          <span className="login-droplet-particle droplet-eight" />
        </div>
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <SupplyPulseLoginMark />
            <span className="login-wordmark"><span>SUPPLY</span><span className="login-wordmark-accent">PULSE</span><span className="login-brand-period">.</span></span>
          </div>

          <div className="login-heading">
            <span className="login-eyebrow">WORKSPACE ACCESS</span>
            <h2>Welcome back.</h2>
            <p>Sign in to continue to your operations workspace.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={18} />
              <input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="login-password-heading">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="login-input-wrap">
              <LockKeyhole size={18} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in to workspace'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="login-security-note">
            <LockKeyhole size={14} />
            Secure access to your SupplyPulse workspace
          </p>
        </div>

        <span className="login-copyright">
          {'\u00A9'} {new Date().getFullYear()} SupplyPulse. All rights reserved.
        </span>
      </section>
    </main>
  )
}

export default Login


