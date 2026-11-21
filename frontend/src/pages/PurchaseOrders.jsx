import { useCallback, useMemo, useState } from 'react'
import {
  ClipboardList, RefreshCw, Search, Plus, Eye, CheckCircle2,
  PackageCheck, Clock3, AlertTriangle, X, Truck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { purchaseOrderService } from '../services/resources'
import useApiResource from '../hooks/useApiResource'
import PurchaseOrderForm from '../components/common/PurchaseOrderForm'
import './PurchaseOrders.css'

const number = new Intl.NumberFormat('en-IN')
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const getName = value => {
  if (!value) return 'Unavailable'
  return typeof value === 'object' ? value.name || value.code || 'Unavailable' : 'Unavailable'
}

const getId = value => (
  typeof value === 'object' ? value?._id : value
)

const getOrderTotal = order => (
  (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  )
)

const formatDate = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

function PurchaseOrders() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const canCreate = ['ADMIN', 'PROCUREMENT_OFFICER'].includes(user?.role)
  const canReceive = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(user?.role)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [messageError, setMessageError] = useState(false)

  const fetchOrders = useCallback(() => purchaseOrderService.getAll(), [])

  const {
    data: orders,
    loading,
    error,
    reload,
  } = useApiResource(fetchOrders)

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter(order => {
      const matchesSearch = !query || [
        order.poNumber,
        getName(order.supplier),
        getName(order.warehouse),
        order.status,
      ].some(value => String(value || '').toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  const draftCount = orders.filter(order => order.status === 'DRAFT').length
  const approvedCount = orders.filter(order => order.status === 'APPROVED').length
  const receivedCount = orders.filter(order => order.status === 'RECEIVED').length
  const totalCommitment = orders.reduce((sum, order) => sum + getOrderTotal(order), 0)

  const handleCreate = async payload => {
    await purchaseOrderService.create(payload)
    await reload()
    setMessageError(false)
    setActionMessage('Purchase order created successfully as a draft.')
  }

  const handleApprove = async order => {
    const confirmed = window.confirm(
      `Approve purchase order ${order.poNumber}?`
    )

    if (!confirmed) return

    setActionId(order._id)
    setActionMessage('')

    try {
      await purchaseOrderService.approve(order._id)
      await reload()
      setMessageError(false)
      setActionMessage(`${order.poNumber} has been approved.`)
      setSelectedOrder(null)
    } catch (err) {
      setMessageError(true)
      setActionMessage(
        err.response?.data?.message || err.message || 'Unable to approve purchase order.',
      )
    } finally {
      setActionId(null)
    }
  }

  const handleReceive = async order => {
    const confirmed = window.confirm(
      `Receive purchase order ${order.poNumber}?\n\nThis action will add its ordered quantities to the selected warehouse stock. This cannot be treated as a preview.`
    )

    if (!confirmed) return

    setActionId(order._id)
    setActionMessage('')

    try {
      await purchaseOrderService.receive(order._id)
      await reload()
      setMessageError(false)
      setActionMessage(`${order.poNumber} received. Warehouse stock has been updated.`)
      setSelectedOrder(null)
    } catch (err) {
      setMessageError(true)
      setActionMessage(
        err.response?.data?.message || err.message || 'Unable to receive purchase order.',
      )
    } finally {
      setActionId(null)
    }
  }

  const handleRefresh = async () => {
    setActionMessage('')
    await reload()
  }

  return (
    <div className="purchase-orders-page">
      <section className="po-metrics-grid">
        <article className="po-metric-card">
          <div className="po-metric-icon po-metric-blue"><ClipboardList size={19} /></div>
          <span>Total orders</span>
          <strong>{number.format(orders.length)}</strong>
          <small>All purchase orders</small>
        </article>

        <article className="po-metric-card">
          <div className="po-metric-icon po-metric-amber"><Clock3 size={19} /></div>
          <span>Draft orders</span>
          <strong>{number.format(draftCount)}</strong>
          <small>Awaiting approval</small>
        </article>

        <article className="po-metric-card">
          <div className="po-metric-icon po-metric-violet"><CheckCircle2 size={19} /></div>
          <span>Approved orders</span>
          <strong>{number.format(approvedCount)}</strong>
          <small>Awaiting receipt</small>
        </article>

        <article className="po-metric-card">
          <div className="po-metric-icon po-metric-green"><PackageCheck size={19} /></div>
          <span>Received orders</span>
          <strong>{number.format(receivedCount)}</strong>
          <small>Completed receipts</small>
        </article>
      </section>

      <section className="po-commitment-strip">
        <div>
          <span className="po-strip-label">TOTAL ORDER COMMITMENT</span>
          <strong>{currency.format(totalCommitment)}</strong>
          <small>Based on the current purchase order records. Not actual expenditure.</small>
        </div>
        <div className="po-strip-icon"><Truck size={25} /></div>
      </section>

      <section className="po-list-panel">
        <div className="po-list-header">
          <div>
            <span className="po-section-eyebrow">PROCUREMENT WORKSPACE</span>
            <h2>Purchase orders</h2>
            <p>Track supplier orders, approvals and warehouse receipts.</p>
          </div>

          <div className="po-header-actions">
            <button
              type="button"
              className="po-refresh-button"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh purchase orders"
            >
              <RefreshCw size={16} className={loading ? 'po-spinning' : ''} />
              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                className="po-create-button"
                onClick={() => setFormOpen(true)}
              >
                <Plus size={17} />
                New purchase order
              </button>
            )}
          </div>
        </div>

        <div className="po-toolbar">
          <div className="po-search-box">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search PO number, supplier or warehouse..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <select
            className="po-status-filter"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            aria-label="Filter purchase orders by status"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {actionMessage && (
          <div className={`po-action-message ${messageError ? 'is-error' : 'is-success'}`}>
            {messageError ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            <span>{actionMessage}</span>
            <button type="button" onClick={() => setActionMessage('')} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </div>
        )}

        {error ? (
          <div className="po-state-box po-error-state">
            <AlertTriangle size={25} />
            <h3>Unable to load purchase orders</h3>
            <p>{error}</p>
            <button type="button" onClick={reload}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : loading ? (
          <div className="po-state-box">
            <RefreshCw size={24} className="po-spinning" />
            <p>Loading purchase orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="po-state-box">
            <ClipboardList size={30} />
            <h3>{orders.length ? 'No matching purchase orders' : 'No purchase orders yet'}</h3>
            <p>
              {orders.length
                ? 'Try changing your search or status filter.'
                : 'Purchase orders created in this workspace will appear here.'}
            </p>
            {canCreate && orders.length === 0 && (
              <button type="button" onClick={() => setFormOpen(true)}>
                <Plus size={15} /> Create first order
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Purchase order</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Order date</th>
                    <th>Items</th>
                    <th>Total value</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order._id}>
                      <td>
                        <strong className="po-number">{order.poNumber}</strong>
                      </td>
                      <td>{getName(order.supplier)}</td>
                      <td>{getName(order.warehouse)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{number.format(order.items?.length || 0)}</td>
                      <td className="po-table-value">{currency.format(getOrderTotal(order))}</td>
                      <td>
                        <span className={`po-status-badge status-${String(order.status || '').toLowerCase()}`}>
                          {order.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="po-view-button"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`View ${order.poNumber}`}
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="po-table-footer">
              Showing {number.format(filteredOrders.length)} of {number.format(orders.length)} orders
            </div>
          </>
        )}
      </section>

      {formOpen && (
        <PurchaseOrderForm
          onClose={() => setFormOpen(false)}
          onSaved={handleCreate}
        />
      )}

      {selectedOrder && (
        <div className="po-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !actionId) setSelectedOrder(null)
        }}>
          <section className="po-details-modal">
            <header className="po-details-header">
              <div>
                <span className="po-section-eyebrow">PURCHASE ORDER DETAILS</span>
                <h2>{selectedOrder.poNumber}</h2>
                <span className={`po-status-badge status-${String(selectedOrder.status || '').toLowerCase()}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <button
                type="button"
                className="po-icon-close"
                onClick={() => setSelectedOrder(null)}
                disabled={Boolean(actionId)}
                aria-label="Close details"
              >
                <X size={19} />
              </button>
            </header>

            <div className="po-detail-meta">
              <div><span>Supplier</span><strong>{getName(selectedOrder.supplier)}</strong></div>
              <div><span>Warehouse</span><strong>{getName(selectedOrder.warehouse)}</strong></div>
              <div><span>Created on</span><strong>{formatDate(selectedOrder.createdAt)}</strong></div>
              <div><span>Received on</span><strong>{formatDate(selectedOrder.receivedAt)}</strong></div>
            </div>

            <h3 className="po-detail-items-title">Ordered products</h3>
            <div className="po-detail-items">
              {(selectedOrder.items || []).map((item, index) => (
                <div className="po-detail-item" key={item._id || `${getId(item.product)}-${index}`}>
                  <div>
                    <strong>{getName(item.product)}</strong>
                    <span>{typeof item.product === 'object' ? item.product.sku : 'Product details unavailable'}</span>
                  </div>
                  <div className="po-detail-quantity">
                    <span>{number.format(item.quantity)} × {currency.format(item.unitPrice)}</span>
                    <strong>{currency.format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="po-detail-total">
              <span>Order total</span>
              <strong>{currency.format(getOrderTotal(selectedOrder))}</strong>
            </div>

            <div className="po-detail-actions">
              {isAdmin && selectedOrder.status === 'DRAFT' && (
                <button
                  type="button"
                  className="po-approve-button"
                  disabled={Boolean(actionId)}
                  onClick={() => handleApprove(selectedOrder)}
                >
                  <CheckCircle2 size={16} />
                  {actionId === selectedOrder._id ? 'Processing...' : 'Approve order'}
                </button>
              )}

              {canReceive && selectedOrder.status === 'APPROVED' && (
                <button
                  type="button"
                  className="po-receive-button"
                  disabled={Boolean(actionId)}
                  onClick={() => handleReceive(selectedOrder)}
                >
                  <PackageCheck size={16} />
                  {actionId === selectedOrder._id ? 'Processing...' : 'Receive order'}
                </button>
              )}

              {selectedOrder.status === 'RECEIVED' && (
                <span className="po-received-note">
                  <CheckCircle2 size={16} /> This order has been received.
                </span>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default PurchaseOrders
