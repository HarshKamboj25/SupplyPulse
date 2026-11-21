import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './WorkspaceLaunchIntro.css'

function SupplyPulseMark() {
  return (
    <svg
      className="workspace-launch-heartbeat"
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

function WorkspaceLaunchIntro() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!location.state?.fromLogin) {
      navigate('/', { replace: true })
      return undefined
    }

    const timer = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, 2600)

    return () => window.clearTimeout(timer)
  }, [location.state, navigate])

  return (
    <main className="workspace-launch">
      <div className="workspace-launch-atmosphere" />
      <div className="workspace-launch-grid" />
      <div className="workspace-launch-orb workspace-launch-orb-one" />
      <div className="workspace-launch-orb workspace-launch-orb-two" />

      <div className="workspace-launch-content">
        <div className="workspace-launch-brand">
          <div className="workspace-launch-mark">
            <SupplyPulseMark />
            <div className="workspace-launch-mark-shine" />
          </div>

          <div className="workspace-launch-wordmark">
            <span className="workspace-launch-name">
              SUPPLY<span>PULSE</span>
            </span>
            <small>SUPPLY CHAIN INTELLIGENCE</small>
          </div>
        </div>

        <div className="workspace-launch-message">
          <span className="workspace-launch-eyebrow">
            WORKSPACE CONNECTED
          </span>

          <h1>Let's dive into your workspace.</h1>
          <p>Your operations. One intelligent workspace.</p>
        </div>

        <div className="workspace-launch-progress">
          <span />
        </div>

        <p className="workspace-launch-footer">
          INVENTORY · PROCUREMENT · INTELLIGENCE
        </p>
      </div>
    </main>
  )
}

export default WorkspaceLaunchIntro
