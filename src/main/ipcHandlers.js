import { ipcMain } from 'electron'
import * as authService from './services/authService.js'
import * as userService from './services/userService.js'
import * as productService from './services/productService.js'
import * as saleService from './services/saleService.js'
import * as reportService from './services/reportService.js'

function wrap(handler) {
  return async (event, payload) => {
    try {
      return { ok: true, data: await handler(event, payload) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }
}

export function registerIpcHandlers() {
  ipcMain.handle(
    'auth:login',
    wrap(async (_e, payload) => authService.login(payload)),
  )
  ipcMain.handle(
    'auth:logout',
    wrap(async () => {
      authService.logout()
      return null
    }),
  )
  ipcMain.handle(
    'auth:getCurrentUser',
    wrap(async () => authService.getCurrentUser()),
  )

  ipcMain.handle(
    'users:getAll',
    wrap(async () => userService.getAllUsers()),
  )
  ipcMain.handle(
    'users:create',
    wrap(async (_e, payload) => userService.createUser(payload)),
  )
  ipcMain.handle(
    'users:update',
    wrap(async (_e, payload) => userService.updateUser(payload)),
  )
  ipcMain.handle(
    'users:delete',
    wrap(async (_e, payload) => userService.deleteUser(payload)),
  )

  ipcMain.handle(
    'products:getAll',
    wrap(async (_e, payload) => productService.getAllProducts(payload ?? {})),
  )
  ipcMain.handle(
    'products:getByBarcode',
    wrap(async (_e, payload) => productService.getProductByBarcode(payload)),
  )
  ipcMain.handle(
    'products:create',
    wrap(async (_e, payload) => productService.createProduct(payload)),
  )
  ipcMain.handle(
    'products:update',
    wrap(async (_e, payload) => productService.updateProduct(payload)),
  )
  ipcMain.handle(
    'products:delete',
    wrap(async (_e, payload) => productService.deleteProduct(payload)),
  )

  ipcMain.handle(
    'sales:create',
    wrap(async (_e, payload) => saleService.createSale(payload)),
  )
  ipcMain.handle(
    'sales:getTodayTotal',
    wrap(async () => saleService.getTodayTotal()),
  )
  ipcMain.handle(
    'sales:getByDateRange',
    wrap(async (_e, payload) => saleService.getByDateRange(payload)),
  )

  ipcMain.handle(
    'reports:exportSalesToExcel',
    wrap(async (event, payload) =>
      reportService.exportSalesToExcel(event.sender, payload ?? {}),
    ),
  )
  ipcMain.handle(
    'reports:exportProductsToExcel',
    wrap(async (event) =>
      reportService.exportProductsToExcel(event.sender),
    ),
  )
}
