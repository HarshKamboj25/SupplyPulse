import { useEffect, useState } from 'react'
import './SupplyPulseIntro.css'

function SupplyPulseMark() {
  return (
    <svg
      className="supplypulse-mark-svg"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className="supplypulse-heartbeat-path"
        d="M9 51H29L40 28L53 73L66 42L73 51H91"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SupplyPulseIntro() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const timer = window.setTimeout(
      () => setVisible(false),
      reducedMotion ? 500 : 5600,
    )

    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="supplypulse-intro" role="status" aria-label="SupplyPulse loading">
      <div className="supplypulse-intro-atmosphere" />
      <div className="supplypulse-intro-grid" />
<div className="supplypulse-cinematic-stage">
        <div className="supplypulse-intro-brand">
          <div className="supplypulse-beam"><span /></div>
          <div className="supplypulse-intro-mark">
            <div className="supplypulse-mark-halo" />
            <SupplyPulseMark />
            <div className="supplypulse-mark-shine" />
          </div>

          <div className="supplypulse-intro-wordmark">
            <span className="supplypulse-intro-name">
              SUPPLY<span>PULSE</span>
            </span>
            <span className="supplypulse-intro-caption">
              SUPPLY CHAIN INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="supplypulse-intro-message">
          <h1>Control Every Move.</h1>
          <p>Smart Inventory. Smarter Decisions.</p>
        </div>

        <div className="supplypulse-intro-loading">
          <div className="supplypulse-intro-track">
            <span />
          </div>
          <p>INITIALIZING YOUR WORKSPACE</p>
        </div>
      </div>

      <div className="supplypulse-intro-footer">
        <span />
        POWERED BY SUPPLYPULSE
        <span />
      </div>
    </div>
  )
}

export default SupplyPulseIntro

