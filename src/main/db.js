import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let SQL = null
/** @type {import('sql.js').Database | null} */
let db = null
let dbFilePath = ''

function wasmLocate(file) {
  const candidates = [
    app?.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file)
      : null,
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    path.join(__dirname, '../../node_modules/sql.js/dist', file),
  ].filter(Boolean)
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[candidates.length - 1]
}

function persistSync() {
  if (!db || !dbFilePath) return
  const dir = path.dirname(dbFilePath)
  fs.mkdirSync(dir, { recursive: true })
  const data = db.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

export function persist() {
  persistSync()
}

/**
 * @param {string} appBasePath - directory containing package.json / app root
 */
export async function initDatabase(appBasePath) {
  SQL = await initSqlJs({ locateFile: wasmLocate })
  dbFilePath = path.join(appBasePath, 'database', 'market_pos.db')
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true })

  if (fs.existsSync(dbFilePath)) {
    const buf = fs.readFileSync(dbFilePath)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  runMigrations()
  persistSync()
  return dbFilePath
}

export function closeDatabase() {
  if (db) {
    persistSync()
    db.close()
    db = null
  }
}

export function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function getDbFilePath() {
  return dbFilePath
}

function runMigrations() {
  const d = getDb()
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin','Cashier')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT NOT NULL UNIQUE COLLATE NOCASE,
      price REAL NOT NULL CHECK(price >= 0),
      stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  `)
}

export function run(sql, params = []) {
  const d = getDb()
  const stmt = d.prepare(sql)
  if (params.length) stmt.bind(params)
  stmt.step()
  stmt.free()
}

export function getRow(sql, params = []) {
  const d = getDb()
  const stmt = d.prepare(sql)
  if (params.length) stmt.bind(params)
  if (!stmt.step()) {
    stmt.free()
    return undefined
  }
  const row = stmt.getAsObject()
  stmt.free()
  return row
}

export function allRows(sql, params = []) {
  const d = getDb()
  const stmt = d.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export function lastInsertRowId() {
  const row = getRow('SELECT last_insert_rowid() AS id', [])
  return Number(row?.id ?? 0)
}
