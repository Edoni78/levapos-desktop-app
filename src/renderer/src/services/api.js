import { sq } from '../locale/sq.js'

async function ipc(channel, payload) {
  if (!window.electronAPI?.invoke) {
    throw new Error(sq.api.mustRunInElectron)
  }
  const res = await window.electronAPI.invoke(channel, payload)
  if (!res?.ok) {
    throw new Error(res?.error || sq.api.requestFailed)
  }
  return res.data
}

export const api = {
  login: (payload) => ipc('auth:login', payload),
  logout: () => ipc('auth:logout'),
  getCurrentUser: () => ipc('auth:getCurrentUser'),

  usersGetAll: () => ipc('users:getAll'),
  usersCreate: (payload) => ipc('users:create', payload),
  usersUpdate: (payload) => ipc('users:update', payload),
  usersDelete: (payload) => ipc('users:delete', payload),

  productsGetAll: (payload) => ipc('products:getAll', payload ?? {}),
  productsGetByBarcode: (payload) => ipc('products:getByBarcode', payload),
  productsCreate: (payload) => ipc('products:create', payload),
  productsUpdate: (payload) => ipc('products:update', payload),
  productsDelete: (payload) => ipc('products:delete', payload),

  salesCreate: (payload) => ipc('sales:create', payload),
  salesGetTodayTotal: () => ipc('sales:getTodayTotal'),
  salesGetByDateRange: (payload) => ipc('sales:getByDateRange', payload),
  salesGetLast: () => ipc('sales:getLast'),
  salesGetRecent: (payload) => ipc('sales:getRecent', payload ?? {}),
  salesDeleteByDateRange: (payload) => ipc('sales:deleteByDateRange', payload),

  reportsExportSalesToExcel: (payload) =>
    ipc('reports:exportSalesToExcel', payload ?? {}),
  reportsExportProductsToExcel: () => ipc('reports:exportProductsToExcel'),
}
