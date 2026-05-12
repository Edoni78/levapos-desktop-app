import { contextBridge, ipcRenderer } from 'electron'

const channels = [
  'auth:login',
  'auth:logout',
  'auth:getCurrentUser',
  'users:getAll',
  'users:create',
  'users:update',
  'users:delete',
  'products:getAll',
  'products:getByBarcode',
  'products:create',
  'products:update',
  'products:delete',
  'sales:create',
  'sales:getTodayTotal',
  'sales:getByDateRange',
  'reports:exportSalesToExcel',
  'reports:exportProductsToExcel',
]

function invoke(channel, payload) {
  if (!channels.includes(channel)) {
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`))
  }
  return ipcRenderer.invoke(channel, payload)
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke,
})
