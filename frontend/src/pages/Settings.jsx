import { useState } from 'react'
import { Bell, LayoutDashboard, Package, ClipboardList, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Settings.css'

const defaultPreferences = {
  compactMode: false,
  lowStockAlerts: true,
  purchaseOrderAlerts: true,
}

function readPreferences() {
  try {
    const saved = localStorage.getItem('supplypulse_preferences')
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(readPreferences)

  const updatePreference = (key) => {
    setPreferences(current => {
      const updated = { ...current, [key]: !current[key] }
      localStorage.setItem('supplypulse_preferences', JSON.stringify(updated))
      return updated
    })
  }

  const roleLabels = {
    ADMIN: 'Administrator',
    WAREHOUSE_MANAGER: 'Warehouse manager',
    PROCUREMENT_OFFICER: 'Procurement officer',
  }

  const role = roleLabels[user?.role] || user?.role || 'Team member'

  return (
    <div className="settings-page">
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><LayoutDashboard size={19} /></div>
          <div>
            <h2>Workspace preferences</h2>
            <p>Choose how SupplyPulse behaves on this device.</p>
          </div>
        </div>

        <div className="settings-option">
          <div className="settings-option-icon"><LayoutDashboard size={18} /></div>
          <div className="settings-option-copy">
            <strong>Compact layout</strong>
            <span>Use a denser layout to fit more information on screen.</span>
          </div>
          <button
            type="button"
            className={`settings-toggle ${preferences.compactMode ? 'is-enabled' : ''}`}
            role="switch"
            aria-checked={preferences.compactMode}
            aria-label="Compact layout"
            onClick={() => updatePreference('compactMode')}
          ><span /></button>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><Bell size={19} /></div>
          <div>
            <h2>Notification preferences</h2>
            <p>Choose which operational alerts you want enabled.</p>
          </div>
        </div>

        <div className="settings-option">
          <div className="settings-option-icon"><Package size={18} /></div>
          <div className="settings-option-copy">
            <strong>Low-stock alerts</strong>
            <span>Show alerts when products reach their reorder threshold.</span>
          </div>
          <button
            type="button"
            className={`settings-toggle ${preferences.lowStockAlerts ? 'is-enabled' : ''}`}
            role="switch"
            aria-checked={preferences.lowStockAlerts}
            aria-label="Low-stock alerts"
            onClick={() => updatePreference('lowStockAlerts')}
          ><span /></button>
        </div>

        <div className="settings-option">
          <div className="settings-option-icon"><ClipboardList size={18} /></div>
          <div className="settings-option-copy">
            <strong>Purchase-order alerts</strong>
            <span>Enable notifications for purchase-order activity.</span>
          </div>
          <button
            type="button"
            className={`settings-toggle ${preferences.purchaseOrderAlerts ? 'is-enabled' : ''}`}
            role="switch"
            aria-checked={preferences.purchaseOrderAlerts}
            aria-label="Purchase-order alerts"
            onClick={() => updatePreference('purchaseOrderAlerts')}
          ><span /></button>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><ShieldCheck size={19} /></div>
          <div>
            <h2>Account information</h2>
            <p>Your currently authenticated SupplyPulse account.</p>
          </div>
        </div>

        <div className="settings-account">
          <div className="settings-account-avatar"><UserRound size={22} /></div>
          <div className="settings-account-details">
            <strong>{user?.name || 'Workspace user'}</strong>
            <span>{user?.email || 'No email available'}</span>
            <span className="settings-role">{role}</span>
          </div>
        </div>
        <p className="settings-account-note">
          Account details are managed by the server. Profile editing and password changes are not currently available.
        </p>
      </section>
    </div>
  )
}
