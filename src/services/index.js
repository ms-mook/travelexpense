/** Service layer ฝั่ง Frontend — หน้าจอเรียกผ่านไฟล์นี้ ไม่เรียก fetch เอง */
import { api, fetchBlob, qs } from './apiClient';

export const authService = {
  me: () => api('/auth/me'),
  bases: () => api('/bases')
};

export const vehicleService = {
  list: (all = false) => api(`/vehicles${all ? '?all=1' : ''}`),
  create: (b) => api('/vehicles', { method: 'POST', body: b }),
  update: (id, b) => api(`/vehicles/${id}`, { method: 'PATCH', body: b })
};

export const tripService = {
  overview: (month) => api(`/me/overview${qs({ month })}`),
  baseHistory: () => api('/me/base-history'),
  listRecords: (q = {}) => api(`/daily-records${qs(q)}`),
  createRecord: (b) => api('/daily-records', { method: 'POST', body: b }),
  getRecord: (id) => api(`/daily-records/${id}`),
  updateRecord: (id, b) => api(`/daily-records/${id}`, { method: 'PATCH', body: b }),
  deleteRecord: (id) => api(`/daily-records/${id}`, { method: 'DELETE' }),
  submitRecord: (id) => api(`/daily-records/${id}/submit`, { method: 'POST' }),
  addTrip: (recordId, b) => api(`/daily-records/${recordId}/trips`, { method: 'POST', body: b }),
  updateTrip: (id, b) => api(`/trips/${id}`, { method: 'PATCH', body: b }),
  deleteTrip: (id) => api(`/trips/${id}`, { method: 'DELETE' })
};

export const expenseService = {
  add: (tripId, b) => api(`/trips/${tripId}/expenses`, { method: 'POST', body: b }),
  remove: (id) => api(`/expenses/${id}`, { method: 'DELETE' }),
  uploadReceipt: (b) => api('/receipts/upload', { method: 'POST', body: b }),
  receiptBlob: (fileId) => fetchBlob(`/receipts/${encodeURIComponent(fileId)}`),
  listMonthly: () => api('/monthly-actuals'),
  saveMonthly: (b) => api('/monthly-actuals', { method: 'POST', body: b, idempotent: false }),
  submitMonthly: (id) => api(`/monthly-actuals/${id}/submit`, { method: 'POST' })
};

export const secretaryService = {
  records: (q) => api(`/secretary/records${qs(q)}`),
  pending: (q = {}) => api(`/secretary/pending${qs(q)}`),
  editTrip: (id, b) => api(`/secretary/trips/${id}`, { method: 'PATCH', body: b }),
  editExpense: (id, b) => api(`/secretary/expenses/${id}`, { method: 'PATCH', body: b }),
  verify: (id) => api(`/secretary/records/${id}/verify`, { method: 'POST', body: {} }),
  returnRecord: (id, reason) => api(`/secretary/records/${id}/return`, { method: 'POST', body: { reason } }),
  monthly: (q) => api(`/secretary/monthly-actuals${qs(q)}`),
  editMonthly: (id, b) => api(`/secretary/monthly-actuals/${id}`, { method: 'PATCH', body: b }),
  verifyMonthly: (id) => api(`/secretary/monthly-actuals/${id}/verify`, { method: 'POST', body: {} }),
  returnMonthly: (id, reason) => api(`/secretary/monthly-actuals/${id}/return`, { method: 'POST', body: { reason } }),
  auditLogs: (q) => api(`/secretary/audit-logs${qs(q)}`)
};

export const reportService = {
  dashboard: (q) => api(`/management/dashboard${qs(q)}`),
  summary: (q) => api(`/management/summary${qs(q)}`),
  bases: () => api('/management/bases'),
  exportCsv: (q) => fetchBlob(`/management/export${qs(q)}`)
};

export const adminService = {
  users: () => api('/admin/users'),
  createUser: (b) => api('/admin/users', { method: 'POST', body: b }),
  updateUser: (id, b) => api(`/admin/users/${id}`, { method: 'PATCH', body: b }),
  resetPassword: (id, password) => api(`/admin/users/${id}/reset-password`, { method: 'POST', body: { password } }),
  bases: () => api('/bases'),
  createBase: (b) => api('/admin/bases', { method: 'POST', body: b }),
  updateBase: (id, b) => api(`/admin/bases/${id}`, { method: 'PATCH', body: b }),
  assignments: (employeeId) => api(`/admin/base-assignments${qs({ employee_id: employeeId })}`),
  assignBase: (b) => api('/admin/base-assignments', { method: 'POST', body: b }),
  policies: () => api('/admin/policies'),
  createPolicy: (b) => api('/admin/policies', { method: 'POST', body: b }),
  updatePolicy: (id, b) => api(`/admin/policies/${id}`, { method: 'PATCH', body: b }),
  settings: () => api('/admin/settings'),
  updateSetting: (key, b) => api(`/admin/settings/${encodeURIComponent(key)}`, { method: 'PATCH', body: b }),
  auditLogs: (q) => api(`/admin/audit-logs${qs(q)}`)
};
