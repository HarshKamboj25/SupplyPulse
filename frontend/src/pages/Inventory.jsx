import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Package,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  productService,
  warehouseService,
} from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import ProductForm from '../components/common/ProductForm'
import './Inventory.css'

const number = new Intl.NumberFormat('en-IN')
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Inventory() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [stockFilter, setStockFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const fetchProducts = useCallback(() => productService.getAll(), [])
  const fetchWarehouses = useCallback(() => warehouseService.getAll(), [])

  const {
    data,
    loading,
    error,
    reload,
  } = useApiResource(fetchProducts)

  const {
    data: warehouses,
    loading: warehousesLoading,
    error: warehouseError,
    reload: reloadWarehouses,
  } = useApiResource(fetchWarehouses)

  const canManage = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(user?.role)
  const canDelete = user?.role === 'ADMIN'

  const categories = useMemo(
    () => [...new Set(data.map(product => product.category).filter(Boolean))].sort(),
    [data],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return data.filter(product => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)

      const matchesCategory =
        category === 'ALL' || product.category === category

      const totalStock = (product.stockByWarehouse || []).reduce(
        (sum, stock) => sum + (Number(stock.quantity) || 0),
        0,
      )

      const threshold = Number(product.reorderThreshold) || 0

      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'LOW' && totalStock <= threshold) ||
        (stockFilter === 'AVAILABLE' && totalStock > threshold) ||
        (stockFilter === 'OUT' && totalStock === 0)

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [data, search, category, stockFilter])

  const openCreateForm = () => {
    setEditingProduct(null)
    setFormOpen(true)
  }

  const openEditForm = product => {
    setEditingProduct(product)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingProduct(null)
  }

  const handleSaved = async () => {
    setActionMessage('')
    await reload()
  }

  const handleDelete = async product => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone. Products with stock or purchase order references cannot be deleted.`
    )

    if (!confirmed) return

    setDeletingId(product._id)
    setActionMessage('')

    try {
      await productService.remove(product._id)
      setActionMessage(`${product.name} was deleted successfully.`)
      await reload()
    } catch (err) {
      setActionMessage(
        err.response?.data?.message ||
        'Unable to delete this product. Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="inventory-page">
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by product name or SKU..."
            aria-label="Search products"
          />
        </div>

        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="ALL">All categories</option>
          {categories.map(item => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={event => setStockFilter(event.target.value)}
          aria-label="Filter by stock status"
        >
          <option value="ALL">All stock levels</option>
          <option value="LOW">Low stock</option>
          <option value="AVAILABLE">Available</option>
          <option value="OUT">Out of stock</option>
        </select>

        <button
          className="inventory-refresh"
          onClick={() => {
            reload()
            reloadWarehouses()
          }}
          disabled={loading}
          aria-label="Refresh inventory"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="inventory-summary">
        <div>
          <span className="panel-eyebrow">STOCK CONTROL</span>
          <h2>Product inventory</h2>
          <p>{filteredProducts.length} of {data.length} products</p>
        </div>

        <div className="inventory-summary-actions">
          <span className="inventory-access">
            {canManage ? 'Management access' : 'Read-only access'}
          </span>

          {canManage && (
            <button
              className="inventory-add-button"
              onClick={openCreateForm}
              disabled={warehousesLoading || warehouses.length === 0}
              title={warehouseError || ''}
            >
              <Plus size={17} />
              Add product
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="inventory-message">
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage('')}>
            Dismiss
          </button>
        </div>
      )}

      {warehouseError && canManage && (
        <div className="inventory-message inventory-error">
          <AlertTriangle size={17} />
          <span>Warehouse data unavailable. Refresh before managing products.</span>
          <button onClick={reloadWarehouses}>Retry</button>
        </div>
      )}

      {error && (
        <div className="inventory-message inventory-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button onClick={reload}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="inventory-state">
          <RefreshCw className="inventory-spinner" size={23} />
          <p>Loading product inventory...</p>
        </div>
      ) : !error && filteredProducts.length === 0 ? (
        <div className="inventory-state">
          <Package size={28} />
          <h3>{data.length ? 'No matching products' : 'No products found'}</h3>
          <p>
            {data.length
              ? 'Try changing your search or filters.'
              : 'Products will appear here when available in your workspace.'}
          </p>
        </div>
      ) : (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit price</th>
                <th>Total stock</th>
                <th>Reorder at</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map(product => {
                const totalStock = (product.stockByWarehouse || []).reduce(
                  (sum, stock) => sum + (Number(stock.quantity) || 0),
                  0,
                )

                const threshold = Number(product.reorderThreshold) || 0
                const lowStock = totalStock <= threshold
                const outOfStock = totalStock === 0

                return (
                  <tr key={product._id}>
                    <td>
                      <div className="inventory-product">
                        <span className="inventory-product-icon">
                          <Package size={17} />
                        </span>
                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.sku}</span>
                        </div>
                      </div>
                    </td>

                    <td>{product.category}</td>
                    <td>{currency.format(Number(product.unitPrice) || 0)}</td>
                    <td className="inventory-stock-number">
                      {number.format(totalStock)}
                    </td>
                    <td>{number.format(threshold)}</td>

                    <td>
                      <span className={`inventory-status ${
                        !product.isActive
                          ? 'out'
                          : outOfStock
                            ? 'out'
                            : lowStock
                              ? 'low'
                              : 'healthy'
                      }`}>
                        {!product.isActive
                          ? 'Inactive'
                          : outOfStock
                            ? 'Out of stock'
                            : lowStock
                              ? 'Low stock'
                              : 'Healthy'}
                      </span>
                    </td>

                    {canManage && (
                      <td>
                        <div className="inventory-row-actions">
                          <button
                            type="button"
                            className="inventory-edit-button"
                            onClick={() => openEditForm(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              className="inventory-delete-button"
                              onClick={() => handleDelete(product)}
                              disabled={deletingId === product._id}
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 size={14} />
                              {deletingId === product._id ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <p className="inventory-footnote">
          Stock totals combine quantities across all registered warehouses.
        </p>
      )}

      {formOpen && (
        <ProductForm
          product={editingProduct}
          warehouses={warehouses}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default Inventory
