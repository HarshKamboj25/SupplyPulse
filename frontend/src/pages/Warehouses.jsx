import { useCallback, useMemo, useState } from 'react'
import {
  Warehouse, RefreshCw, Search, Plus, Pencil, Trash2,
  AlertTriangle, Package, MapPin, Boxes
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { warehouseService, productService } from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import WarehouseForm from '../components/common/WarehouseForm'
import './Warehouses.css'

const number = new Intl.NumberFormat('en-IN')
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Warehouses() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const fetchWarehouses = useCallback(
    () => warehouseService.getAll(),
    [],
  )

  const fetchProducts = useCallback(
    () => productService.getAll(),
    [],
  )

  const {
    data: warehouses,
    loading,
    error,
    reload,
  } = useApiResource(fetchWarehouses)

  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApiResource(fetchProducts)

  const warehouseStats = useMemo(() => {
    const stats = new Map()

    warehouses.forEach(warehouse => {
      stats.set(String(warehouse._id), {
        units: 0,
        value: 0,
        products: 0,
      })
    })

    products.forEach(product => {
      ;(product.stockByWarehouse || []).forEach(stock => {
        const warehouseId = String(
          stock.warehouse?._id || stock.warehouse || ''
        )
        const current = stats.get(warehouseId)

        if (!current) return

        const quantity = Number(stock.quantity) || 0
        current.units += quantity
        current.value += quantity * (Number(product.unitPrice) || 0)

        if (quantity > 0) current.products += 1
      })
    })

    return stats
  }, [warehouses, products])

  const filteredWarehouses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return warehouses.filter(warehouse => {
      const matchesSearch = !query || [
        warehouse.name,
        warehouse.code,
        warehouse.city,
      ].some(value => String(value || '').toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && warehouse.isActive) ||
        (statusFilter === 'inactive' && !warehouse.isActive)

      return matchesSearch && matchesStatus
    })
  }, [warehouses, search, statusFilter])

  const totalUnits = [...warehouseStats.values()].reduce(
    (sum, item) => sum + item.units,
    0,
  )

  const activeCount = warehouses.filter(item => item.isActive).length
  const totalCapacity = warehouses.reduce(
    (sum, item) => sum + (Number(item.capacityUnits) || 0),
    0,
  )

  const openCreateForm = () => {
    setEditingWarehouse(null)
    setFormOpen(true)
  }

  const openEditForm = warehouse => {
    setEditingWarehouse(warehouse)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingWarehouse(null)
  }

  const handleSaved = async () => {
    await reload()
    setActionMessage('Warehouse details saved successfully.')
  }

  const handleDelete = async warehouse => {
    const confirmed = window.confirm(
      `Delete warehouse "${warehouse.name}"? This action cannot be undone. Warehouses referenced by product stock or purchase orders cannot be deleted.`
    )

    if (!confirmed) return

    setDeletingId(warehouse._id)
    setActionMessage('')

    try {
      await warehouseService.remove(warehouse._id)
      setActionMessage('Warehouse deleted successfully.')
      await reload()
    } catch (err) {
      setActionMessage(
        err.response?.data?.message ||
        'Unable to delete this warehouse. It may be referenced by existing product stock or purchase orders.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const retryAll = () => {
    reload()
    reloadProducts()
  }

  return (
    <section className="warehouses-page">
      <div className="warehouses-toolbar">
        <div className="warehouses-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search warehouse, code or city..."
            aria-label="Search warehouses"
          />
        </div>

        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          aria-label="Filter warehouse status"
        >
          <option value="all">All warehouses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          className="warehouses-refresh"
          onClick={retryAll}
          disabled={loading || productsLoading}
          aria-label="Refresh warehouse data"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="warehouses-summary">
        <div>
          <span className="panel-eyebrow">STORAGE NETWORK</span>
          <h2>Warehouse locations</h2>
          <p>{filteredWarehouses.length} of {warehouses.length} warehouses</p>
        </div>

        <div className="warehouses-summary-actions">
          <span className="warehouses-access">
            {isAdmin ? 'Management access' : 'Read-only access'}
          </span>

          {isAdmin && (
            <button
              type="button"
              className="warehouses-add-button"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Add warehouse
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="warehouses-message">
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage('')}>
            Dismiss
          </button>
        </div>
      )}

      {(error || productsError) && (
        <div className="warehouses-message warehouses-error">
          <AlertTriangle size={17} />
          <span>
            {error
              ? 'Warehouse data could not be loaded.'
              : 'Product stock data could not be loaded. Capacity metrics may be incomplete.'}
          </span>
          <button type="button" onClick={retryAll}>Retry</button>
        </div>
      )}

      <div className="warehouses-metrics">
        <article className="warehouse-metric-card">
          <span className="warehouse-metric-icon"><Warehouse size={18} /></span>
          <div>
            <span>Total warehouses</span>
            <strong>{number.format(warehouses.length)}</strong>
          </div>
        </article>

        <article className="warehouse-metric-card">
          <span className="warehouse-metric-icon"><Boxes size={18} /></span>
          <div>
            <span>Active locations</span>
            <strong>{number.format(activeCount)}</strong>
          </div>
        </article>

        <article className="warehouse-metric-card">
          <span className="warehouse-metric-icon"><Package size={18} /></span>
          <div>
            <span>Total stock units</span>
            <strong>{number.format(totalUnits)}</strong>
          </div>
        </article>

        <article className="warehouse-metric-card">
          <span className="warehouse-metric-icon"><MapPin size={18} /></span>
          <div>
            <span>Combined capacity</span>
            <strong>{number.format(totalCapacity)}</strong>
          </div>
        </article>
      </div>

      {loading || productsLoading ? (
        <div className="warehouses-state">
          <RefreshCw className="warehouses-spinner" size={23} />
          <p>Loading warehouse network...</p>
        </div>
      ) : error ? (
        <div className="warehouses-state">
          <AlertTriangle size={28} />
          <h3>Unable to load warehouses</h3>
          <p>Check your connection and try again.</p>
          <button type="button" onClick={retryAll}>Retry</button>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="warehouses-state">
          <Warehouse size={28} />
          <h3>{warehouses.length ? 'No matching warehouses' : 'No warehouses found'}</h3>
          <p>
            {warehouses.length
              ? 'Try changing your search or status filter.'
              : 'Registered warehouse locations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="warehouses-grid">
          {filteredWarehouses.map(warehouse => {
            const stats = warehouseStats.get(String(warehouse._id)) || {
              units: 0,
              value: 0,
              products: 0,
            }

            const capacity = Number(warehouse.capacityUnits) || 0
            const utilization = capacity > 0
              ? (stats.units / capacity) * 100
              : null

            return (
              <article className="warehouse-card" key={warehouse._id}>
                <div className="warehouse-card-header">
                  <span className="warehouse-card-icon">
                    <Warehouse size={20} />
                  </span>
                  <span className={`warehouse-status ${
                    warehouse.isActive ? 'active' : 'inactive'
                  }`}>
                    {warehouse.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="warehouse-card-title">
                  <span>{warehouse.code}</span>
                  <h3>{warehouse.name}</h3>
                  <p><MapPin size={13} /> {warehouse.city}</p>
                </div>

                <div className="warehouse-card-stats">
                  <div>
                    <span>Current stock</span>
                    <strong>{number.format(stats.units)} <small>units</small></strong>
                  </div>
                  <div>
                    <span>Stock value</span>
                    <strong>{currency.format(stats.value)}</strong>
                  </div>
                </div>

                <div className="warehouse-capacity">
                  <div className="warehouse-capacity-heading">
                    <span>Capacity utilization</span>
                    <strong>
                      {utilization === null
                        ? 'Not configured'
                        : `${utilization.toFixed(1)}%`}
                    </strong>
                  </div>

                  <div
                    className="warehouse-capacity-track"
                    role="progressbar"
                    aria-label={`${warehouse.name} capacity utilization`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={utilization === null
                      ? 0
                      : Math.min(utilization, 100)}
                  >
                    <span
                      style={{
                        width: `${utilization === null
                          ? 0
                          : Math.min(utilization, 100)}%`,
                      }}
                    />
                  </div>

                  <p>
                    {number.format(stats.units)} of {number.format(capacity)} units
                  </p>
                </div>

                <footer className="warehouse-card-footer">
                  <span>{number.format(stats.products)} stocked products</span>

                  {isAdmin && (
                    <div className="warehouse-card-actions">
                      <button
                        type="button"
                        onClick={() => openEditForm(warehouse)}
                        aria-label={`Edit ${warehouse.name}`}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="warehouse-delete-button"
                        onClick={() => handleDelete(warehouse)}
                        disabled={deletingId === warehouse._id}
                        aria-label={`Delete ${warehouse.name}`}
                      >
                        <Trash2 size={14} />
                        {deletingId === warehouse._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {formOpen && (
        <WarehouseForm
          warehouse={editingWarehouse}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default Warehouses
