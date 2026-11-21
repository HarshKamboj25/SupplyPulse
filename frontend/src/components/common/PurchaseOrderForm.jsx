import { useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, Save, X, AlertCircle } from 'lucide-react'
import { supplierService, warehouseService, productService } from '../../services/resources'
import useApiResource from '../../hooks/useApiResource'
import './PurchaseOrderForm.css'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function PurchaseOrderForm({ onClose, onSaved }) {
  const fetchSuppliers = useCallback(() => supplierService.getAll(), [])
  const fetchWarehouses = useCallback(() => warehouseService.getAll(), [])
  const fetchProducts = useCallback(() => productService.getAll(), [])

  const { data: suppliers, loading: suppliersLoading } = useApiResource(fetchSuppliers)
  const { data: warehouses, loading: warehousesLoading } = useApiResource(fetchWarehouses)
  const { data: products, loading: productsLoading } = useApiResource(fetchProducts)

  const [supplier, setSupplier] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [items, setItems] = useState([
    { product: '', quantity: 1, unitPrice: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeSuppliers = suppliers.filter(item => item.isActive)
  const activeWarehouses = warehouses.filter(item => item.isActive)
  const activeProducts = products.filter(item => item.isActive)

  const total = useMemo(
    () => items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0,
    ),
    [items],
  )

  const updateItem = (index, field, value) => {
    setItems(current => current.map((item, i) => {
      if (i !== index) return item

      if (field === 'product') {
        const selected = activeProducts.find(product => product._id === value)
        return {
          ...item,
          product: value,
          unitPrice: selected ? Number(selected.unitPrice) : 0,
        }
      }

      return { ...item, [field]: value }
    }))
  }

  const addItem = () => {
    setItems(current => [...current, {
      product: '',
      quantity: 1,
      unitPrice: 0,
    }])
  }

  const removeItem = index => {
    setItems(current => current.filter((_, i) => i !== index))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    if (!supplier || !warehouse) {
      setError('Please select both a supplier and a warehouse.')
      return
    }

    if (!items.length || items.some(item => (
      !item.product ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1 ||
      !Number.isFinite(Number(item.unitPrice)) ||
      Number(item.unitPrice) < 0
    ))) {
      setError('Please select valid products and enter valid quantities and prices.')
      return
    }

    const productIds = items.map(item => item.product)

    if (new Set(productIds).size !== productIds.length) {
      setError('A product can only appear once in an order. Update its quantity instead.')
      return
    }

    try {
      setSaving(true)

      await onSaved({
        supplier,
        warehouse,
        items: items.map(item => ({
          product: item.product,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      })

      onClose()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to create purchase order.',
      )
    } finally {
      setSaving(false)
    }
  }

  const loading = suppliersLoading || warehousesLoading || productsLoading

  return (
    <div className="po-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="po-form-modal">
        <header className="po-form-header">
          <div>
            <span className="po-form-eyebrow">PROCUREMENT</span>
            <h2>Create purchase order</h2>
            <p>Create a new draft order for your supplier.</p>
          </div>
          <button type="button" className="po-icon-close" onClick={onClose} disabled={saving}>
            <X size={19} />
          </button>
        </header>

        {loading ? (
          <div className="po-form-loading">Loading suppliers, warehouses and products...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="po-form-fields">
              <label>
                Supplier
                <select value={supplier} onChange={event => setSupplier(event.target.value)} required>
                  <option value="">Select supplier</option>
                  {activeSuppliers.map(item => (
                    <option key={item._id} value={item._id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Deliver to warehouse
                <select value={warehouse} onChange={event => setWarehouse(event.target.value)} required>
                  <option value="">Select warehouse</option>
                  {activeWarehouses.map(item => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="po-form-section-heading">
              <div>
                <h3>Order items</h3>
                <p>Add products and specify their order quantities.</p>
              </div>
              <button type="button" className="po-add-item" onClick={addItem}>
                <Plus size={15} /> Add product
              </button>
            </div>

            <div className="po-form-items">
              {items.map((item, index) => (
                <div className="po-form-item" key={index}>
                  <div className="po-form-product">
                    <label>
                      Product
                      <select
                        value={item.product}
                        onChange={event => updateItem(index, 'product', event.target.value)}
                        required
                      >
                        <option value="">Select product</option>
                        {activeProducts.map(product => (
                          <option
                            key={product._id}
                            value={product._id}
                            disabled={items.some((other, i) => i !== index && other.product === product._id)}
                          >
                            {product.sku} · {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={event => updateItem(index, 'quantity', event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Unit price (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={event => updateItem(index, 'unitPrice', event.target.value)}
                      required
                    />
                  </label>

                  <div className="po-form-line-total">
                    <span>Line total</span>
                    <strong>{currency.format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong>
                  </div>

                  <button
                    type="button"
                    className="po-remove-item"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    aria-label="Remove product"
                    title="Remove product"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>

            {activeProducts.length === 0 && (
              <p className="po-form-hint">No active products are available for ordering.</p>
            )}

            <div className="po-form-total">
              <span>Estimated order total</span>
              <strong>{currency.format(total)}</strong>
            </div>

            {error && (
              <div className="po-form-error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <footer className="po-form-footer">
              <button type="button" className="po-cancel-button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="po-submit-button"
                disabled={saving || loading || !activeProducts.length || !activeSuppliers.length || !activeWarehouses.length}
              >
                <Save size={16} />
                {saving ? 'Creating...' : 'Create draft order'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  )
}

export default PurchaseOrderForm
