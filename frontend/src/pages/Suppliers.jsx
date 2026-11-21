import { useCallback, useMemo, useState } from 'react'
import {
  Truck, RefreshCw, Search, Plus, Pencil, Trash2,
  AlertTriangle, Mail, Phone, Clock3, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supplierService } from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import SupplierForm from '../components/common/SupplierForm'
import './Suppliers.css'

const number = new Intl.NumberFormat('en-IN')

function Suppliers() {
  const { user } = useAuth()
  const canManage = ['ADMIN', 'PROCUREMENT_OFFICER'].includes(user?.role)
  const isAdmin = user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [messageError, setMessageError] = useState(false)

  const fetchSuppliers = useCallback(
    () => supplierService.getAll(),
    [],
  )

  const {
    data: suppliers,
    loading,
    error,
    reload,
  } = useApiResource(fetchSuppliers)

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return suppliers.filter(supplier => {
      const matchesSearch = !query || [
        supplier.name,
        supplier.email,
        supplier.phone,
      ].some(value => String(value || '').toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && supplier.isActive) ||
        (statusFilter === 'inactive' && !supplier.isActive)

      return matchesSearch && matchesStatus
    })
  }, [suppliers, search, statusFilter])

  const activeCount = suppliers.filter(item => item.isActive).length
  const inactiveCount = suppliers.length - activeCount

  const averageLeadTime = suppliers.length
    ? suppliers.reduce(
        (sum, item) => sum + (Number(item.maxLeadDays) || 0), 0
      ) / suppliers.length
    : 0

  const openCreateForm = () => {
    setEditingSupplier(null)
    setFormOpen(true)
  }

  const openEditForm = supplier => {
    setEditingSupplier(supplier)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingSupplier(null)
  }

  const handleSaved = async () => {
    await reload()
    setMessageError(false)
    setActionMessage('Supplier details saved successfully.')
  }

  const handleDelete = async supplier => {
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? Suppliers linked to existing purchase orders cannot be deleted.`
    )

    if (!confirmed) return

    setDeletingId(supplier._id)
    setActionMessage('')

    try {
      await supplierService.remove(supplier._id)
      setMessageError(false)
      setActionMessage('Supplier deleted successfully.')
      await reload()
    } catch (err) {
      setMessageError(true)
      setActionMessage(
        err.response?.data?.message ||
        'Unable to delete supplier. It may be referenced by an existing purchase order.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="suppliers-page">
      <div className="suppliers-toolbar">
        <div className="suppliers-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search supplier, email or phone..."
            aria-label="Search suppliers"
          />
        </div>

        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          aria-label="Filter supplier status"
        >
          <option value="all">All suppliers</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          className="suppliers-refresh"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh supplier data"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="suppliers-summary">
        <div>
          <span className="panel-eyebrow">PROCUREMENT NETWORK</span>
          <h2>Supplier directory</h2>
          <p>
            Showing {number.format(filteredSuppliers.length)} of{' '}
            {number.format(suppliers.length)} suppliers
          </p>
        </div>

        <div className="suppliers-summary-actions">
          <span className="suppliers-access">
            {canManage ? 'Management access' : 'Read-only access'}
          </span>

          {canManage && (
            <button
              type="button"
              className="suppliers-add-button"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Add supplier
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className={`suppliers-message ${
          messageError ? 'suppliers-error' : ''
        }`}>
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage('')}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="suppliers-message suppliers-error">
          <AlertTriangle size={17} />
          <span>Supplier data could not be loaded.</span>
          <button type="button" onClick={reload}>Retry</button>
        </div>
      )}

      <div className="suppliers-metrics">
        <article className="supplier-metric-card">
          <span className="supplier-metric-icon"><Users size={18} /></span>
          <div>
            <span>Total suppliers</span>
            <strong>{number.format(suppliers.length)}</strong>
          </div>
        </article>

        <article className="supplier-metric-card">
          <span className="supplier-metric-icon"><Truck size={18} /></span>
          <div>
            <span>Active suppliers</span>
            <strong>{number.format(activeCount)}</strong>
          </div>
        </article>

        <article className="supplier-metric-card">
          <span className="supplier-metric-icon"><Clock3 size={18} /></span>
          <div>
            <span>Average lead time</span>
            <strong>{averageLeadTime.toFixed(1)} <small>days</small></strong>
          </div>
        </article>

        <article className="supplier-metric-card">
          <span className="supplier-metric-icon"><AlertTriangle size={18} /></span>
          <div>
            <span>Inactive suppliers</span>
            <strong>{number.format(inactiveCount)}</strong>
          </div>
        </article>
      </div>

      {loading ? (
        <div className="suppliers-state">
          <RefreshCw className="suppliers-spinner" size={23} />
          <p>Loading supplier network...</p>
        </div>
      ) : error ? (
        <div className="suppliers-state">
          <AlertTriangle size={28} />
          <h3>Unable to load suppliers</h3>
          <p>Check your connection and try again.</p>
          <button type="button" onClick={reload}>Retry</button>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="suppliers-state">
          <Truck size={28} />
          <h3>{suppliers.length ? 'No matching suppliers' : 'No suppliers found'}</h3>
          <p>
            {suppliers.length
              ? 'Try changing your search or status filter.'
              : 'Registered suppliers will appear here.'}
          </p>
          {canManage && suppliers.length === 0 && (
            <button type="button" onClick={openCreateForm}>
              <Plus size={16} /> Add supplier
            </button>
          )}
        </div>
      ) : (
        <div className="suppliers-grid">
          {filteredSuppliers.map(supplier => (
            <article className="supplier-card" key={supplier._id}>
              <div className="supplier-card-header">
                <span className="supplier-card-icon">
                  <Truck size={20} />
                </span>

                <span className={`supplier-status ${
                  supplier.isActive ? 'active' : 'inactive'
                }`}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="supplier-card-title">
                <span>SUPPLIER PARTNER</span>
                <h3>{supplier.name}</h3>
              </div>

              <div className="supplier-contact-list">
                {supplier.email ? (
                  <div>
                    <Mail size={15} />
                    <span>{supplier.email}</span>
                  </div>
                ) : (
                  <div className="supplier-contact-muted">
                    <Mail size={15} />
                    <span>Email not provided</span>
                  </div>
                )}

                {supplier.phone ? (
                  <div>
                    <Phone size={15} />
                    <span>{supplier.phone}</span>
                  </div>
                ) : (
                  <div className="supplier-contact-muted">
                    <Phone size={15} />
                    <span>Phone not provided</span>
                  </div>
                )}
              </div>

              <div className="supplier-lead-time">
                <span className="supplier-lead-icon">
                  <Clock3 size={17} />
                </span>
                <div>
                  <span>Maximum lead time</span>
                  <strong>
                    {number.format(Number(supplier.maxLeadDays) || 0)} days
                  </strong>
                </div>
              </div>

              <footer className="supplier-card-footer">
                <span>Supplier account</span>

                {canManage && (
                  <div className="supplier-card-actions">
                    <button
                      type="button"
                      onClick={() => openEditForm(supplier)}
                      aria-label={`Edit ${supplier.name}`}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        className="supplier-delete-button"
                        onClick={() => handleDelete(supplier)}
                        disabled={deletingId === supplier._id}
                        aria-label={`Delete ${supplier.name}`}
                      >
                        <Trash2 size={14} />
                        {deletingId === supplier._id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default Suppliers
