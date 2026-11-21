import { useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  ClipboardList,
  Package,
  RefreshCw,
  Truck,
  Wallet,
} from 'lucide-react'
import {
  analyticsService,
  productService,
  purchaseOrderService,
  supplierService,
  warehouseService,
} from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import './Overview.css'

const emptyOverview = {
  products: [],
  warehouses: [],
  suppliers: [],
  orders: [],
  lowStock: [],
  warnings: [],
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat('en-IN')

function extractRows(result) {
  return result.status === 'fulfilled'
    ? result.value.data?.data ?? []
    : []
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className="overview-metric">
      <div className={`overview-metric-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <span className="overview-metric-label">{label}</span>
      <strong className="overview-metric-value">{value}</strong>
      <span className="overview-metric-detail">{detail}</span>
    </article>
  )
}

function Overview() {
  const fetchOverview = useCallback(async () => {
    const results = await Promise.allSettled([
      productService.getAll(),
      warehouseService.getAll(),
      supplierService.getAll(),
      purchaseOrderService.getAll(),
      analyticsService.getLowStock(),
    ])

    if (results.every(result => result.status === 'rejected')) {
      throw new Error('Unable to connect to the SupplyPulse API.')
    }

    const labels = [
      'Products',
      'Warehouses',
      'Suppliers',
      'Purchase orders',
      'Low-stock report',
    ]

    const warnings = results
      .map((result, index) => (
        result.status === 'rejected'
          ? `${labels[index]} could not be loaded.`
          : null
      ))
      .filter(Boolean)

    return {
      data: {
        products: extractRows(results[0]),
        warehouses: extractRows(results[1]),
        suppliers: extractRows(results[2]),
        orders: extractRows(results[3]),
        lowStock: extractRows(results[4]),
        warnings,
      },
    }
  }, [])

  const {
    data,
    loading,
    error,
    reload,
  } = useApiResource(fetchOverview, emptyOverview)

  const totalUnits = data.products.reduce(
    (total, product) => total + (product.stockByWarehouse || [])
      .reduce((sum, stock) => sum + (Number(stock.quantity) || 0), 0),
    0,
  )

  const inventoryValue = data.products.reduce(
    (total, product) => total + (product.stockByWarehouse || [])
      .reduce(
        (sum, stock) => sum + (
          (Number(stock.quantity) || 0) * (Number(product.unitPrice) || 0)
        ),
        0,
      ),
    0,
  )

  const orderStatuses = ['DRAFT', 'APPROVED', 'RECEIVED', 'CANCELLED']
  const statusCounts = Object.fromEntries(
    orderStatuses.map(status => [
      status,
      data.orders.filter(order => order.status === status).length,
    ]),
  )

  if (loading) {
    return (
      <section className="overview-data-state">
        <Activity size={25} className="overview-loading-icon" />
        <h2>Gathering your operations data</h2>
        <p>Connecting inventory, warehouses and procurement.</p>
      </section>
    )
  }

  if (error && !data.products.length && !data.warehouses.length) {
    return (
      <section className="overview-data-state overview-error">
        <AlertTriangle size={26} />
        <h2>Dashboard data unavailable</h2>
        <p>{error}</p>
        <button className="overview-retry" onClick={reload}>
          <RefreshCw size={15} /> Try again
        </button>
      </section>
    )
  }

  return (
    <div className="live-overview">
      <div className="overview-live-heading">
        <div>
          <span className="panel-eyebrow">LIVE OPERATIONS</span>
          <h2>Your business at a glance</h2>
          <p>Metrics calculated from your connected SupplyPulse records.</p>
        </div>
        <button
          className="overview-refresh"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {data.warnings.length > 0 && (
        <div className="overview-warning">
          <AlertTriangle size={17} />
          <span>{data.warnings.join(' ')}</span>
        </div>
      )}

      <div className="overview-metrics-grid">
        <MetricCard
          icon={Wallet}
          label="Inventory value"
          value={currency.format(inventoryValue)}
          detail="Current stock × unit price"
          tone="green"
        />
        <MetricCard
          icon={Boxes}
          label="Total stock units"
          value={number.format(totalUnits)}
          detail="Across all warehouses"
          tone="blue"
        />
        <MetricCard
          icon={Package}
          label="Products"
          value={number.format(data.products.length)}
          detail="Product records"
          tone="purple"
        />
        <MetricCard
          icon={Building2}
          label="Warehouses"
          value={number.format(data.warehouses.length)}
          detail="Registered locations"
          tone="orange"
        />
        <MetricCard
          icon={Truck}
          label="Suppliers"
          value={number.format(data.suppliers.length)}
          detail="Registered suppliers"
          tone="teal"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Low-stock items"
          value={number.format(data.lowStock.length)}
          detail="At or below reorder threshold"
          tone="red"
        />
      </div>

      <div className="overview-bottom-grid">
        <section className="overview-data-panel">
          <div className="overview-panel-heading">
            <div>
              <span className="panel-eyebrow">PROCUREMENT</span>
              <h3>Purchase order status</h3>
            </div>
            <ClipboardList size={20} />
          </div>

          <div className="overview-status-list">
            {orderStatuses.map(status => (
              <div className="overview-status-row" key={status}>
                <span className={`overview-status-dot status-${status.toLowerCase()}`} />
                <span>{status.replace('_', ' ')}</span>
                <strong>{statusCounts[status]}</strong>
              </div>
            ))}
          </div>
          <div className="overview-order-total">
            <span>Total purchase orders</span>
            <strong>{data.orders.length}</strong>
          </div>
        </section>

        <section className="overview-data-panel">
          <div className="overview-panel-heading">
            <div>
              <span className="panel-eyebrow">STOCK ATTENTION</span>
              <h3>Low-stock watchlist</h3>
            </div>
            <AlertTriangle size={20} />
          </div>

          {data.lowStock.length === 0 ? (
            <div className="overview-empty">
              No low-stock items reported.
            </div>
          ) : (
            <div className="overview-low-stock-list">
              {data.lowStock.slice(0, 5).map((item, index) => (
                <div
                  className="overview-low-stock-row"
                  key={`${item.sku || item._id || 'item'}-${index}`}
                >
                  <div>
                    <strong>{item.name || item.sku || 'Product'}</strong>
                    <span>{item.sku || 'No SKU'} · {item.category || 'Uncategorised'}</span>
                  </div>
                  <span className="overview-stock-quantity">
                    {number.format(Number(item.quantity) || 0)} left
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.lowStock.length > 5 && (
            <p className="overview-more">
              And {data.lowStock.length - 5} more items
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default Overview
