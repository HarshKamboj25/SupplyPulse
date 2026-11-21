import { lazy, Suspense, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import TopbarTools from './components/common/TopbarTools'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined,
  ChevronDown, CircleHelp, ClipboardList, Command, LayoutDashboard, Menu, LogOut,
  Package, Plus, Search, Settings, ShieldCheck, Truck, Warehouse, X,
  ArrowUpRight as ExternalLink, Clock3, ScanLine, Zap
} from 'lucide-react'
import './App.css'
const Overview = lazy(() => import('./pages/Overview'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Warehouses = lazy(() => import('./pages/Warehouses'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'))
const Analytics = lazy(() => import('./pages/Analytics'))
const SettingsPage = lazy(() => import('./pages/Settings'))

const navigation = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/' },
      { label: 'Inventory', icon: Package, path: '/inventory' },
      { label: 'Warehouses', icon: Warehouse, path: '/warehouses' },
      { label: 'Suppliers', icon: Truck, path: '/suppliers' },
      { label: 'Purchase orders', icon: ClipboardList, path: '/purchase-orders' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { label: 'Analytics', icon: ChartNoAxesCombined, path: '/analytics' },
    ],
  },
]

const pageDescriptions = {
  '/': 'A live picture of your supply chain, from stock to sourcing.',
  '/inventory': 'Track products, stock levels and availability.',
  '/warehouses': 'Your storage locations and warehouse operations.',
  '/suppliers': 'Manage supplier relationships and procurement partners.',
  '/purchase-orders': 'Follow purchasing activity from order to delivery.',
  '/analytics': 'Understand operational performance through your data.',
  '/settings': 'Manage your workspace preferences and account information.',
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = location.pathname
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth()

  const displayName = user?.name || 'Workspace user'
  const userInitials = displayName
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const roleLabels = {
    ADMIN: 'Administrator',
    WAREHOUSE_MANAGER: 'Warehouse manager',
    PROCUREMENT_OFFICER: 'Procurement officer',
  }

  const displayRole = roleLabels[user?.role] || user?.role || 'Team member'

  const activePage = navigation.flatMap(group => group.items)
    .find(item => item.path === activePath)

  const pageTitle = activePage?.label || (activePath === '/settings' ? 'Settings' : 'Overview')

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={22} strokeWidth={2.4} /></div>
          <div className="brand-copy">
            <span className="brand-name">
              <span className="brand-supply">SUPPLY</span><span className="brand-pulse">PULSE</span><span className="brand-period">.</span>
            </span>
            <span className="brand-caption">SUPPLY CHAIN INTELLIGENCE</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar"><Activity size={17} /></div>
          <div className="workspace-info">
            <span className="workspace-label">CURRENT WORKSPACE</span>
            <strong>SupplyPulse HQ</strong>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="sidebar-context">
          <span className="context-line" />
          <span>CONTROL CENTRE</span>
        </div>

        <nav className="sidebar-navigation">
          {navigation.map(group => (
            <div className="nav-group" key={group.title}>
              <span className="nav-group-title">{group.title}</span>
              {group.items.map(item => {
                const Icon = item.icon
                const isActive = activePath === item.path
                return (
                  <button
                    key={item.path}
                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                    onClick={() => {
                      navigate(item.path)
                      setSidebarOpen(false)
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {isActive && <span className="nav-active-indicator" />}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-pulse" />
            <div>
              <strong>Workspace console</strong>
              <span>Connected interface</span>
            </div>
          </div>

          <button
            className={`nav-item sidebar-settings ${activePath === '/settings' ? 'nav-item-active' : ''}`}
            onClick={() => {
              navigate('/settings')
              setSidebarOpen(false)
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="sidebar-footer">
            <div className="user-avatar">{userInitials}</div>
            <div className="user-info">
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </div>
            <button
              className="logout-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <div className="workspace-particles" aria-hidden="true">
          <span className="workspace-particle particle-box"><Package size={19} /></span>
          <span className="workspace-particle particle-truck"><Truck size={21} /></span>
          <span className="workspace-particle particle-warehouse"><Warehouse size={20} /></span>
          <span className="workspace-particle particle-boxes"><Boxes size={20} /></span>
          <span className="workspace-particle particle-activity"><Activity size={20} /></span>
          <span className="workspace-particle particle-clipboard"><ClipboardList size={22} /></span>
          <span className="workspace-particle particle-scan"><ScanLine size={21} /></span>
          <span className="workspace-particle particle-package-three"><Package size={23} /></span>
          <span className="workspace-particle particle-boxes-two"><Boxes size={22} /></span>
          <span className="workspace-particle particle-package-two"><Package size={17} /></span>
          <i className="workspace-particle-dot particle-dot-one" />
          <i className="workspace-particle-dot particle-dot-two" />
          <i className="workspace-particle-dot particle-dot-three" />
          <i className="workspace-particle-dot particle-dot-four" />
        </div>
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <TopbarTools onNavigate={navigate} />
            <div className="topbar-divider" />
            <div className="profile-menu-wrapper">
  <button
    type="button"
    className="topbar-profile"
    aria-label="Open account menu"
    aria-expanded={profileOpen}
    onClick={() => setProfileOpen(current => !current)}
  >
    <div className="user-avatar top-avatar">{userInitials}</div>
    <ChevronDown size={15} />
  </button>

  {profileOpen && (
    <div className="profile-dropdown">
      <div className="profile-dropdown-header">
        <div className="user-avatar top-avatar">{userInitials}</div>
        <div>
          <strong>{displayName}</strong>
          <span>{user?.email || 'No email available'}</span>
        </div>
      </div>

      <div className="profile-dropdown-details">
        <span>ACCOUNT DESIGNATION</span>
        <div className="profile-dropdown-role">
          <ShieldCheck size={16} />
          <strong>{displayRole}</strong>
        </div>
      </div>

      <button
        type="button"
        className="profile-dropdown-logout"
        onClick={() => {
          setProfileOpen(false)
          logout()
        }}
      >
        <LogOut size={17} />
        <span>Sign out</span>
      </button>
    </div>
  )}
</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="heading-kicker">
                <span className="kicker-dot" />
                SUPPLYPULSE / {activePath === '/' ? 'LIVE OVERVIEW' : pageTitle.toUpperCase()}
              </div>
              <h1 aria-label={pageTitle}>
              {Array.from(pageTitle).map((character, index) => (
                <span
                  className="heading-character"
                  key={`${character}-${index}`}
                  style={{ animationDelay: `${650 + index * 48}ms` }}
                  aria-hidden="true"
                >
                  {character === ' ' ? '\u00A0' : character}
                </span>
              ))}
              <span
                className="heading-period"
                style={{ animationDelay: `${650 + pageTitle.length * 48}ms` }}
                aria-hidden="true"
              >.</span>
            </h1>
              <p>{pageDescriptions[activePath] || pageDescriptions['/']}</p>
            </div>
            <div className="heading-actions">
              <span className="date-context"><Clock3 size={14} /> Operations workspace</span>
              <button className="primary-action" onClick={() => navigate('/inventory')}>
                <ScanLine size={16} /> Explore inventory
              </button>
            </div>
          </div>

          <Suspense fallback={
            <section className="module-placeholder">
              <span className="panel-eyebrow">LOADING MODULE</span>
              <h2>Preparing workspace...</h2>
            </section>
          }>
          {activePath === '/' ? (
            <Overview />
          ) : activePath === '/inventory' ? (
            <Inventory />
          ) : activePath === '/warehouses' ? (
            <Warehouses />
          ) : activePath === '/suppliers' ? (
            <Suppliers />
          ) : activePath === '/purchase-orders' ? (
            <PurchaseOrders />
          ) : activePath === '/analytics' ? (
            <Analytics />
          ) : activePath === '/settings' ? (
            <SettingsPage />
          ) : (<section className="module-placeholder">
              <div className="placeholder-icon"><Activity size={25} /></div>
              <span className="panel-eyebrow">MODULE SELECTED</span>
              <h2>{pageTitle} workspace</h2>
              <p>{pageDescriptions[activePath]}</p>
              <span className="placeholder-note">The live data view for this module is the next build step.</span>
            </section>
          )}
          </Suspense>
        </section>
      </main>
    </div>
  )
}

export default App










