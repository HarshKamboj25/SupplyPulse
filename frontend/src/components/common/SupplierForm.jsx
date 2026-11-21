import { useState } from 'react'
import { Save, X, AlertCircle } from 'lucide-react'
import { supplierService } from '../../services/resources'
import './SupplierForm.css'

function SupplierForm({ supplier, onClose, onSaved }) {
  const editing = Boolean(supplier?._id)

  const [form, setForm] = useState(() => ({
    name: supplier?.name || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    maxLeadDays: supplier?.maxLeadDays ?? 7,
    isActive: supplier?.isActive ?? true,
  }))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    const leadDays = Number(form.maxLeadDays)

    if (!Number.isInteger(leadDays) || leadDays < 0) {
      setError('Maximum lead days must be a non-negative whole number.')
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      maxLeadDays: leadDays,
      isActive: form.isActive,
    }

    if (!payload.name) {
      setError('Supplier name is required.')
      return
    }

    try {
      setSaving(true)

      if (editing) {
        await supplierService.update(supplier._id, payload)
      } else {
        await supplierService.create(payload)
      }

      await onSaved()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Unable to save supplier.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="supplier-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        className="supplier-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-form-title"
      >
        <header className="supplier-modal-header">
          <div>
            <span className="panel-eyebrow">SUPPLIER MANAGEMENT</span>
            <h2 id="supplier-form-title">
              {editing ? 'Edit supplier' : 'Add new supplier'}
            </h2>
            <p>
              {editing
                ? 'Update supplier contact and delivery details.'
                : 'Register a supplier in your procurement network.'}
            </p>
          </div>

          <button
            type="button"
            className="supplier-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="supplier-form-grid">
            <label className="supplier-full-field">
              Supplier name *
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
                placeholder="e.g. TechNova Components"
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                maxLength={254}
                value={form.email}
                onChange={event => updateField('email', event.target.value)}
                placeholder="supplier@example.com"
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                maxLength={25}
                value={form.phone}
                onChange={event => updateField('phone', event.target.value)}
                placeholder="Contact number"
              />
            </label>

            <label>
              Maximum lead time (days) *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.maxLeadDays}
                onChange={event => updateField('maxLeadDays', event.target.value)}
              />
            </label>

            <label>
              Supplier status
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
            <div className="supplier-form-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <footer className="supplier-form-footer">
            <button
              type="button"
              className="supplier-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="supplier-save-button"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create supplier'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default SupplierForm
