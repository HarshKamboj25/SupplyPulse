import { useState } from 'react'
import { Plus, Save, X, AlertCircle } from 'lucide-react'
import { productService } from '../../services/resources'
import './ProductForm.css'

function ProductForm({ product, warehouses, onClose, onSaved }) {
  const editing = Boolean(product?._id)

  const [form, setForm] = useState(() => ({
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || '',
    unitPrice: product?.unitPrice ?? '',
    reorderThreshold: product?.reorderThreshold ?? 5,
    isActive: product?.isActive ?? true,
    stockByWarehouse: (product?.stockByWarehouse || []).map(stock => ({
      warehouse: typeof stock.warehouse === 'object'
        ? stock.warehouse?._id
        : stock.warehouse,
      quantity: stock.quantity ?? 0,
      binLocation: stock.binLocation || '',
    })),
  }))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const updateStock = (index, field, value) => {
    setForm(current => ({
      ...current,
      stockByWarehouse: current.stockByWarehouse.map((stock, i) =>
        i === index ? { ...stock, [field]: value } : stock
      ),
    }))
  }

  const addWarehouseStock = () => {
    const used = form.stockByWarehouse.map(stock => String(stock.warehouse))
    const available = warehouses.find(
      warehouse => !used.includes(String(warehouse._id))
    )

    if (!available) return

    setForm(current => ({
      ...current,
      stockByWarehouse: [
        ...current.stockByWarehouse,
        {
          warehouse: available._id,
          quantity: 0,
          binLocation: '',
        },
      ],
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    if (!form.stockByWarehouse.every(stock => stock.warehouse)) {
      setError('Please select a warehouse for every stock entry.')
      return
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      unitPrice: Number(form.unitPrice),
      reorderThreshold: Number(form.reorderThreshold),
      isActive: form.isActive,
    }

    if (!editing) {
      payload.stockByWarehouse = form.stockByWarehouse.map(stock => ({
        warehouse: stock.warehouse,
        quantity: Number(stock.quantity),
        binLocation: stock.binLocation.trim(),
      }))
    }

    try {
      setSaving(true)

      if (editing) {
        await productService.update(product._id, payload)
      } else {
        await productService.create(payload)
      }

      await onSaved()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Unable to save product.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="product-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        <header className="product-modal-header">
          <div>
            <span className="panel-eyebrow">INVENTORY MANAGEMENT</span>
            <h2 id="product-form-title">
              {editing ? 'Edit product' : 'Add new product'}
            </h2>
            <p>
              {editing
                ? 'Update product information. Existing warehouse stock is protected.'
                : 'Register a product and its opening warehouse stock.'}
            </p>
          </div>
          <button
            type="button"
            className="product-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <label>
              SKU *
              <input
                required
                maxLength={50}
                value={form.sku}
                onChange={event => updateField('sku', event.target.value)}
                placeholder="e.g. KB-103"
              />
            </label>

            <label>
              Product name *
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
                placeholder="Product name"
              />
            </label>

            <label>
              Category *
              <input
                required
                maxLength={80}
                value={form.category}
                onChange={event => updateField('category', event.target.value)}
                placeholder="e.g. Keyboards"
              />
            </label>

            <label>
              Unit price (INR) *
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={event => updateField('unitPrice', event.target.value)}
              />
            </label>

            <label>
              Reorder threshold
              <input
                type="number"
                min="0"
                value={form.reorderThreshold}
                onChange={event => updateField('reorderThreshold', event.target.value)}
              />
            </label>

            <label className="product-active-field">
              Product status
              <select
                value={String(form.isActive)}
                onChange={event => updateField('isActive', event.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          <div className="product-stock-heading">
            <div>
              <h3>Warehouse stock</h3>
              <p>{editing ? "Stock is read-only while editing. Receive a purchase order to update stock." : "Set the opening stock for each warehouse."}</p>
            </div>
            {!editing && (
            <button
              type="button"
              className="product-add-stock"
              onClick={addWarehouseStock}
              disabled={form.stockByWarehouse.length >= warehouses.length}
            >
              <Plus size={15} /> Add warehouse
            </button>
            )}
          </div>

          {form.stockByWarehouse.length === 0 && (
            <p className="product-no-stock">
              No warehouse stock assigned yet. Add a warehouse to begin.
            </p>
          )}

          {form.stockByWarehouse.map((stock, index) => (
            <div className="product-stock-row" key={`${stock.warehouse}-${index}`}>
              <label>
                Warehouse
                <select
                  required
                  disabled={editing}
                  value={stock.warehouse || ''}
                  onChange={event => updateStock(index, 'warehouse', event.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map(warehouse => {
                    const alreadyUsed = form.stockByWarehouse.some(
                      (item, i) => i !== index &&
                        String(item.warehouse) === String(warehouse._id)
                    )

                    return (
                      <option
                        key={warehouse._id}
                        value={warehouse._id}
                        disabled={alreadyUsed}
                      >
                        {warehouse.name} ({warehouse.code})
                      </option>
                    )
                  })}
                </select>
              </label>

              <label>
                Quantity
                <input
                  required
                  disabled={editing}
                  type="number"
                  min="0"
                  value={stock.quantity}
                  onChange={event => updateStock(index, 'quantity', event.target.value)}
                />
              </label>

              <label>
                Bin location
                <input
                  maxLength={50}
                  disabled={editing}
                  value={stock.binLocation}
                  onChange={event => updateStock(index, 'binLocation', event.target.value)}
                  placeholder="e.g. A-01"
                />
              </label>
            </div>
          ))}

          {error && (
            <div className="product-form-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <footer className="product-form-footer">
            <button
              type="button"
              className="product-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="product-save-button"
              disabled={saving || warehouses.length === 0}
            >
              <Save size={16} />
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create product'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default ProductForm
