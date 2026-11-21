import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Command, Bell, X, Package, Warehouse, Truck,
  ClipboardList, AlertTriangle, CheckCheck, RefreshCw, ChevronRight
} from 'lucide-react'
import {
  productService,
  warehouseService,
  supplierService,
  purchaseOrderService,
  analyticsService,
} from '../../services/resources'

const getRows = (response) => {
  const data = response?.data?.data ?? response?.data ?? []
  return Array.isArray(data) ? data : []
}

const readStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

const getName = (value) => {
  if (!value) return 'Unknown'
  if (typeof value === 'string') return value
  return value.name || value.code || value.email || 'Unknown'
}

const routeFor = {
  Product: '/inventory',
  Warehouse: '/warehouses',
  Supplier: '/suppliers',
  'Purchase Order': '/purchase-orders',
}

const iconFor = {
  Product: Package,
  Warehouse,
  Supplier: Truck,
  'Purchase Order': ClipboardList,
}

export default function TopbarTools({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchData, setSearchData] = useState({
    products: [],
    warehouses: [],
    suppliers: [],
    orders: [],
  })
  const [lowStock, setLowStock] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [preferences, setPreferences] = useState(() =>
    readStorage('supplypulse_preferences', {
      lowStockAlerts: true,
      purchaseOrderAlerts: true,
    })
  )
  const [notificationState, setNotificationState] = useState(() =>
    readStorage('supplypulse_notification_state', {
      read: [],
      dismissed: [],
    })
  )

  const searchRef = useRef(null)
  const searchContainerRef = useRef(null)
  const notificationRef = useRef(null)

  const saveNotificationState = useCallback((next) => {
    setNotificationState(next)
    try {
      localStorage.setItem('supplypulse_notification_state', JSON.stringify(next))
    } catch {
      // Notifications remain usable for the current session.
    }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    const results = await Promise.allSettled([
      productService.getAll(),
      warehouseService.getAll(),
      supplierService.getAll(),
      purchaseOrderService.getAll(),
      analyticsService.getLowStock(),
    ])

    const failed = results.every((result) => result.status === 'rejected')

    if (failed) {
      setLoadError(true)
      setLoading(false)
      return
    }

    const valueAt = (index) =>
      results[index].status === 'fulfilled'
        ? getRows(results[index].value)
        : []

    setSearchData({
      products: valueAt(0),
      warehouses: valueAt(1),
      suppliers: valueAt(2),
      orders: valueAt(3),
    })
    setLowStock(valueAt(4))
    setOrders(valueAt(3))
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setNotificationsOpen(false)
        setSearchOpen(true)
        setTimeout(() => searchRef.current?.focus(), 0)
      }

      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }

    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchOpen(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false)
      }
    }

    const handleStorage = (event) => {
      if (event.key === 'supplypulse_preferences') {
        setPreferences(readStorage('supplypulse_preferences', {
          lowStockAlerts: true,
          purchaseOrderAlerts: true,
        }))
      }
      if (event.key === 'supplypulse_notification_state') {
        setNotificationState(readStorage('supplypulse_notification_state', {
          read: [],
          dismissed: [],
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []

    const matches = []

    searchData.products.forEach((item) => {
      const searchable = [item.name, item.sku, item.category].join(' ').toLowerCase()
      if (searchable.includes(term)) {
        matches.push({
          id: item._id,
          type: 'Product',
          title: item.name || item.sku || 'Unnamed product',
          subtitle: item.sku || item.category || 'Inventory item',
        })
      }
    })

    searchData.warehouses.forEach((item) => {
      const searchable = [item.name, item.code, item.city, item.location].join(' ').toLowerCase()
      if (searchable.includes(term)) {
        matches.push({
          id: item._id,
          type: 'Warehouse',
          title: item.name || item.code || 'Unnamed warehouse',
          subtitle: [item.code, item.city].filter(Boolean).join(' · '),
        })
      }
    })

    searchData.suppliers.forEach((item) => {
      const searchable = [item.name, item.email, item.contactPerson, item.phone].join(' ').toLowerCase()
      if (searchable.includes(term)) {
        matches.push({
          id: item._id,
          type: 'Supplier',
          title: item.name || 'Unnamed supplier',
          subtitle: item.email || item.phone || 'Supplier',
        })
      }
    })

    searchData.orders.forEach((item) => {
      const searchable = [
        item.poNumber,
        getName(item.supplier),
        getName(item.warehouse),
        item.status,
      ].join(' ').toLowerCase()

      if (searchable.includes(term)) {
        matches.push({
          id: item._id,
          type: 'Purchase Order',
          title: item.poNumber || 'Purchase order',
          subtitle: `${getName(item.supplier)} · ${item.status || 'Unknown status'}`,
        })
      }
    })

    return matches.slice(0, 8)
  }, [query, searchData])

  const notifications = useMemo(() => {
    const items = []

    if (preferences.lowStockAlerts !== false) {
      lowStock.forEach((item, index) => {
        const identity = item._id || item.sku || item.name || `row-${index}`
        const warehouse = item.warehouse
          ? getName(item.warehouse)
          : 'Inventory'

        items.push({
          id: `low-stock-${identity}-${typeof item.warehouse === 'string' ? item.warehouse : item.warehouse?._id || ''}`,
          type: 'low-stock',
          title: `Low stock: ${item.name || item.sku || 'Product'}`,
          description: `${item.sku ? `${item.sku} · ` : ''}${warehouse}`,
          path: '/inventory',
        })
      })
    }

    if (preferences.purchaseOrderAlerts !== false) {
      orders.forEach((order) => {
        if (!['DRAFT', 'APPROVED'].includes(String(order.status || '').toUpperCase())) {
          return
        }

        const status = String(order.status).toUpperCase()
        items.push({
          id: `purchase-order-${order._id}-${status}`,
          type: 'purchase-order',
          title: `PO ${order.poNumber || ''} ${status === 'DRAFT' ? 'awaiting approval' : 'awaiting receipt'}`,
          description: getName(order.supplier),
          path: '/purchase-orders',
        })
      })
    }

    return items.filter((item) => !notificationState.dismissed.includes(item.id))
  }, [lowStock, orders, preferences, notificationState.dismissed])

  const unreadCount = notifications.filter(
    (item) => !notificationState.read.includes(item.id)
  ).length

  const openResult = (result) => {
    onNavigate(routeFor[result.type])
    setQuery('')
    setSearchOpen(false)
  }

  const openNotification = (item) => {
    saveNotificationState({
      ...notificationState,
      read: [...new Set([...notificationState.read, item.id])],
    })
    onNavigate(item.path)
    setNotificationsOpen(false)
  }

  const markAllRead = () => {
    saveNotificationState({
      ...notificationState,
      read: [...new Set([
        ...notificationState.read,
        ...notifications.map((item) => item.id),
      ])],
    })
  }

  const dismissNotification = (event, id) => {
    event.stopPropagation()
    saveNotificationState({
      ...notificationState,
      dismissed: [...new Set([...notificationState.dismissed, id])],
    })
  }

  return (
    <div className="topbar-tools">
      <div className="global-search-wrap" ref={searchContainerRef}>
        <div className="global-search">
          <Search size={17} />
          <input
            ref={searchRef}
            value={query}
            onFocus={() => {
              setNotificationsOpen(false)
              setSearchOpen(true)
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your workspace..."
            aria-label="Search workspace"
            aria-expanded={searchOpen}
          />
          {query ? (
            <button
              type="button"
              className="topbar-tool-clear"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd><Command size={11} /> K</kbd>
          )}
        </div>

        {searchOpen && query.trim() && (
          <div className="topbar-search-results">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => {
                const Icon = iconFor[result.type]
                return (
                  <button
                    type="button"
                    className="topbar-search-result"
                    key={`${result.type}-${result.id || index}`}
                    onClick={() => openResult(result)}
                  >
                    <span className="topbar-result-icon"><Icon size={17} /></span>
                    <span className="topbar-result-copy">
                      <strong>{result.title}</strong>
                      <small>{result.type} · {result.subtitle}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                )
              })
            ) : (
              <div className="topbar-search-empty">
                {loading ? 'Searching workspace...' : 'No matching records found.'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-notification-wrap" ref={notificationRef}>
        <button
          type="button"
          className="topbar-icon-button"
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          onClick={() => {
            setSearchOpen(false)
            setNotificationsOpen((current) => !current)
            if (!notificationsOpen) refreshData()
          }}
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>

        {notificationsOpen && (
          <div className="topbar-notification-panel">
            <div className="topbar-notification-header">
              <div>
                <strong>Notifications</strong>
                <small>{unreadCount} unread</small>
              </div>
              <div className="topbar-notification-actions">
                <button
                  type="button"
                  onClick={refreshData}
                  aria-label="Refresh notifications"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="topbar-notification-empty">Loading notifications...</div>
            ) : loadError ? (
              <div className="topbar-notification-empty">
                Unable to load notifications. Please try refreshing.
              </div>
            ) : notifications.length === 0 ? (
              <div className="topbar-notification-empty">
                <Bell size={22} />
                <strong>You're all caught up</strong>
                <span>No active alerts right now.</span>
              </div>
            ) : (
              <div className="topbar-notification-list">
                {notifications.map((item) => {
                  const isRead = notificationState.read.includes(item.id)
                  return (
                    <div
                      className={`topbar-notification-item ${isRead ? 'is-read' : ''}`}
                      key={item.id}
                    >
                      <button
                        type="button"
                        className="topbar-notification-content"
                        onClick={() => openNotification(item)}
                      >
                        <span className={`topbar-notification-icon ${item.type}`}>
                          {item.type === 'low-stock'
                            ? <AlertTriangle size={17} />
                            : <ClipboardList size={17} />}
                        </span>
                        <span className="topbar-notification-copy">
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>
                        {!isRead && <span className="topbar-unread-indicator" />}
                      </button>
                      <button
                        type="button"
                        className="topbar-notification-dismiss"
                        aria-label="Dismiss notification"
                        title="Dismiss"
                        onClick={(event) => dismissNotification(event, item.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="topbar-notification-footer">
              <span>Alerts are based on current workspace data.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
