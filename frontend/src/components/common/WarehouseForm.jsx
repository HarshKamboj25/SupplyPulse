import { useState } from 'react'
import { Save, X, AlertCircle } from 'lucide-react'
import { warehouseService } from '../../services/resources'
import './WarehouseForm.css'

function WarehouseForm({ warehouse, onClose, onSaved }) {
  const editing = Boolean(warehouse?._id)

  const [form, setForm] = useState(() => ({
    code: warehouse?.code || '',
    name: warehouse?.name || '',
    city: warehouse?.city || '',
    capacityUnits: warehouse?.capacityUnits ?? 0,
    isActive: warehouse?.isActive ?? true,
  }))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    const capacity = Number(form.capacityUnits)

    if (!Number.isFinite(capacity) || capacity < 0) {
      setError('Capacity must be a valid non-negative number.')
      return
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      city: form.city.trim(),
      capacityUnits: capacity,
      isActive: form.isActive,
    }

    try {
      setSaving(true)

      if (editing) {
        await warehouseService.update(warehouse._id, payload)
      } else {
        await warehouseService.create(payload)
      }

      await onSaved()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Unable to save warehouse.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="warehouse-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        className="warehouse-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-form-title"
      >
        <header className="warehouse-modal-header">
          <div>
            <span className="panel-eyebrow">WAREHOUSE MANAGEMENT</span>
            <h2 id="warehouse-form-title">
              {editing ? 'Edit warehouse' : 'Add new warehouse'}
            </h2>
            <p>
              {editing
                ? 'Update warehouse details and capacity.'
                : 'Register a storage location in your workspace.'}
            </p>
          </div>

          <button
            type="button"
            className="warehouse-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="warehouse-form-grid">
            <label>
              Warehouse code *
              <input
                required
                maxLength={30}
                value={form.code}
                onChange={event => updateField('code', event.target.value)}
                placeholder="e.g. WH-DEL-02"
              />
            </label>

            <label>
              Warehouse name *
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
                placeholder="Warehouse name"
              />
            </label>

            <label>
              City *
              <input
                required
                maxLength={80}
                value={form.city}
                onChange={event => updateField('city', event.target.value)}
                placeholder="e.g. Delhi"
              />
            </label>

            <label>
              Capacity (units) *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.capacityUnits}
                onChange={event => updateField('capacityUnits', event.target.value)}
              />
            </label>

            <label className="warehouse-active-field">
              Warehouse status
              <select
                value={String(form.isActive)}
                onChange={event => updateField('isActive', event.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          {error && (
            <div className="warehouse-form-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <footer className="warehouse-form-footer">
            <button
              type="button"
              className="warehouse-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="warehouse-save-button"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create warehouse'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default WarehouseForm
