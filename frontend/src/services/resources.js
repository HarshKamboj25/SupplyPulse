import api from './api'

export const productService = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
}

export const warehouseService = {
  getAll: (params = {}) => api.get('/warehouses', { params }),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.patch(`/warehouses/${id}`, data),
  remove: (id) => api.delete(`/warehouses/${id}`),
}

export const supplierService = {
  getAll: (params = {}) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.patch(`/suppliers/${id}`, data),
  remove: (id) => api.delete(`/suppliers/${id}`),
}

export const purchaseOrderService = {
  getAll: (params = {}) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  approve: (id) => api.patch(`/purchase-orders/${id}/approve`),
  receive: (id) => api.patch(`/purchase-orders/${id}/receive`),
}

export const analyticsService = {
  getLowStock: () => api.get('/analytics/low-stock'),
}
