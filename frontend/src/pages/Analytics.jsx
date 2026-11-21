import { useCallback, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  Package,
  RefreshCw,
  TrendingUp,
  Wallet,
  Warehouse,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  analyticsService,
  productService,
  purchaseOrderService,
  warehouseService,
} from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import './Analytics.css'

const emptyAnalytics = {
  products: [],
  warehouses: [],
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

const chartColors = ['#16a36a', '#478bb3', '#d99032', '#8264b4', '#df6262', '#238c7c']

const orderStatuses = ['DRAFT', 'APPROVED', 'RECEIVED', 'CANCELLED']

function extractRows(result) {
  return result.status === 'fulfilled'
    ? result.value.data?.data ?? []
    : []
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className="analytics-metric">
      <div className={`analytics-metric-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <span className="analytics-metric-label">{label}</span>
      <strong className="analytics-metric-value">{value}</strong>
      <span className="analytics-metric-detail">{detail}</span>
    </article>
  )
}

function Analytics() {
  const fetchAnalytics = useCallback(async () => {
    const results = await Promise.allSettled([
      productService.getAll(),
      warehouseService.getAll(),
      purchaseOrderService.getAll(),
      analyticsService.getLowStock(),
    ])

    if (results.every(result => result.status === 'rejected')) {
      throw new Error('Unable to connect to the SupplyPulse API.')
    }

    const labels = [
      'Products',
      'Warehouses',
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
        orders: extractRows(results[2]),
        lowStock: extractRows(results[3]),
        warnings,
      },
    }
  }, [])

  const { data, loading, error, reload } = useApiResource(
    fetchAnalytics,
    emptyAnalytics,
  )

  const metrics = useMemo(() => {
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

    const statuses = Object.fromEntries(
      orderStatuses.map(status => [
        status,
        data.orders.filter(order => order.status === status).length,
      ]),
    )

    return { totalUnits, inventoryValue, statuses }
  }, [data])

  const warehouseData = useMemo(() => {
    return data.warehouses.map(warehouse => {
      const stock = data.products.reduce(
        (totals, product) => {
          const entry = (product.stockByWarehouse || []).find(
            item => String(item.warehouse?._id || item.warehouse) === String(warehouse._id),
          )

          const quantity = Number(entry?.quantity) || 0

          return {
            units: totals.units + quantity,
            value: totals.value + quantity * (Number(product.unitPrice) || 0),
          }
        },
        { units: 0, value: 0 },
      )

      return {
        name: warehouse.code || warehouse.name,
        units: stock.units,
        value: stock.value,
      }
    })
  }, [data.products, data.warehouses])

  const categoryData = useMemo(() => {
    const categories = {}

    data.products.forEach(product => {
      const category = product.category || 'Uncategorised'
      const units = (product.stockByWarehouse || []).reduce(
        (sum, stock) => sum + (Number(stock.quantity) || 0),
        0,
      )

      categories[category] = (categories[category] || 0) + units
    })

    return Object.entries(categories).map(([name, units]) => ({
      name,
      units,
    }))
  }, [data.products])

  const lowStockRows = useMemo(() => {
    const warehouseNames = new Map(
      data.warehouses.map(item => [String(item._id), item.name || item.code]),
    )

    return data.lowStock.map((item, index) => ({
      ...item,
      id: `${item.sku || item._id || 'item'}-${index}`,
      warehouseName: warehouseNames.get(
        String(item.warehouse?._id || item.warehouse),
      ) || 'Unknown warehouse',
    }))
  }, [data.lowStock, data.warehouses])

  if (loading) {
    return (
      <section className="analytics-state">
        <Activity className="analytics-loading-icon" size={26} />
        <h2>Preparing your analytics</h2>
        <p>Collecting live inventory and procurement data.</p>
      </section>
    )
  }

  if (error && !data.products.length && !data.warehouses.length) {
    return (
      <section className="analytics-state analytics-error">
        <AlertTriangle size={26} />
        <h2>Analytics unavailable</h2>
        <p>{error}</p>
        <button className="analytics-refresh" onClick={reload}>
          <RefreshCw size={15} /> Try again
        </button>
      </section>
    )
  }

  return (
    <div className="analytics-page">
      <div className="analytics-heading">
        <div>
          <span className="panel-eyebrow">BUSINESS INTELLIGENCE</span>
          <h2>Operational performance</h2>
          <p>Insights calculated from your connected SupplyPulse records.</p>
        </div>
        <button
          className="analytics-refresh"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {data.warnings.length > 0 && (
        <div className="analytics-warning">
          <AlertTriangle size={17} />
          <span>{data.warnings.join(' ')}</span>
        </div>
      )}

      <div className="analytics-metrics-grid">
        <MetricCard
          icon={Wallet}
          label="Inventory valuation"
          value={currency.format(metrics.inventoryValue)}
          detail="Current stock × unit price"
          tone="green"
        />
        <MetricCard
          icon={Boxes}
          label="Total stock units"
          value={number.format(metrics.totalUnits)}
          detail="Across all warehouses"
          tone="blue"
        />
        <MetricCard
          icon={Package}
          label="Products"
          value={number.format(data.products.length)}
          detail="Registered product records"
          tone="purple"
        />
        <MetricCard
          icon={Warehouse}
          label="Warehouses"
          value={number.format(data.warehouses.length)}
          detail="Registered locations"
          tone="orange"
        />
        <MetricCard
          icon={TrendingUp}
          label="Purchase orders"
          value={number.format(data.orders.length)}
          detail="All recorded order statuses"
          tone="teal"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Low-stock entries"
          value={number.format(data.lowStock.length)}
          detail="At or below reorder threshold"
          tone="red"
        />
      </div>

      <div className="analytics-chart-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="panel-eyebrow">WAREHOUSE INSIGHTS</span>
              <h3>Stock distribution</h3>
            </div>
            <Warehouse size={20} />
          </div>

          {warehouseData.length === 0 ? (
            <div className="analytics-empty">No warehouse data available.</div>
          ) : (
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouseData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ece9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [number.format(value), 'Units']} />
                  <Bar dataKey="units" fill="#16a36a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="analytics-warehouse-list">
            {warehouseData.map(item => (
              <div className="analytics-warehouse-row" key={item.name}>
                <span>{item.name}</span>
                <strong>{number.format(item.units)} units</strong>
                <span>{currency.format(item.value)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="panel-eyebrow">PRODUCT MIX</span>
              <h3>Category distribution</h3>
            </div>
            <Package size={20} />
          </div>

          {categoryData.length === 0 ? (
            <div className="analytics-empty">No category data available.</div>
          ) : (
            <>
              <div className="analytics-chart analytics-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="units"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {categoryData.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [number.format(value), 'Units']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="analytics-legend">
                {categoryData.map((item, index) => (
                  <div className="analytics-legend-row" key={item.name}>
                    <span
                      className="analytics-legend-dot"
                      style={{ background: chartColors[index % chartColors.length] }}
                    />
                    <span>{item.name}</span>
                    <strong>{number.format(item.units)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="panel-eyebrow">PROCUREMENT</span>
              <h3>Purchase order status</h3>
            </div>
            <TrendingUp size={20} />
          </div>

          <div className="analytics-status-list">
            {orderStatuses.map(status => (
              <div className="analytics-status-row" key={status}>
                <span className={`analytics-status-dot status-${status.toLowerCase()}`} />
                <span>{status}</span>
                <strong>{metrics.statuses[status]}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-status-total">
            <span>Total purchase orders</span>
            <strong>{data.orders.length}</strong>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="panel-eyebrow">STOCK ATTENTION</span>
              <h3>Low-stock watchlist</h3>
            </div>
            <AlertTriangle size={20} />
          </div>

          {lowStockRows.length === 0 ? (
            <div className="analytics-empty">No low-stock entries reported.</div>
          ) : (
            <div className="analytics-low-stock-list">
              {lowStockRows.map(item => (
                <div className="analytics-low-stock-row" key={item.id}>
                  <div>
                    <strong>{item.name || item.sku || 'Product'}</strong>
                    <span>{item.sku || 'No SKU'} · {item.warehouseName}</span>
                  </div>
                  <span className="analytics-stock-quantity">
                    {number.format(Number(item.quantity) || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Analytics
