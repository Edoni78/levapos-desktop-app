# Market POS Desktop App (Leva POS) - Electron + SQLite

Build a desktop Point of Sale system using:

- Electron
- React
- SQLite
- Node.js
- Tailwind CSS

The app must work fully offline as a desktop app.

## Main Goal

Create a market POS system where the cashier can scan product barcodes, sell products, manage products, manage users, and export sales reports.

## Main Features

### 1. Authentication

Create a login system with local SQLite users.

User fields:

- id
- fullName
- username
- passwordHash
- role
- createdAt

Roles:

- Admin
- Cashier

Admin can:

- manage users
- manage products
- view reports
- export reports
- use POS panel

Cashier can:

- use POS panel
- view today sales total

### 2. Product Management

Admin must be able to:

- create product
- edit product
- delete product
- search products
- register product barcode
- update price
- update stock quantity

Product fields:

- id
- name
- barcode
- price
- stockQuantity
- createdAt
- updatedAt

Barcode must be unique.

### 3. Barcode Scanner Support

The barcode scanner works like a keyboard.

When the cashier scans a barcode:

- search product by barcode
- add product to current cart
- if product already exists in cart, increase quantity
- calculate line total
- calculate full cart total

If barcode does not exist:

- show message: Product not found
- allow admin to register product

### 4. POS Sales Panel

Create a clean POS screen.

The POS screen must include:

- barcode input focused automatically
- scanned products table
- product name
- price
- quantity
- line total
- remove item button
- increase/decrease quantity buttons
- total price in euros
- finish sale button
- clear cart button

When clicking Finish Sale:

- save sale in SQLite
- save sale items
- reduce product stock
- show receipt summary
- clear cart for the next customer

### 5. Sales System

Create tables:

Sales:

- id
- userId
- totalAmount
- createdAt

SaleItems:

- id
- saleId
- productId
- productName
- barcode
- quantity
- unitPrice
- lineTotal

The system must calculate:

- today total sales in euros
- number of sales today
- total sales by date
- total sales by cashier

### 6. Dashboard

Create dashboard cards:

- Today sales total in €
- Number of sales today
- Products count
- Low stock products

Admin can view all data.

Cashier can only view their own sales and today's total.

### 7. Export to Excel

Add export feature.

Admin can export:

- today's sales
- sales by date range
- products list

Use Excel export library like `exceljs`.

Export file format:

- `.xlsx`

Columns for sales export:

- Sale ID
- Cashier Name
- Product Name
- Barcode
- Quantity
- Unit Price
- Line Total
- Sale Total
- Date

### 8. SQLite Database

Use SQLite local database.

Database file:

```txt
database/market_pos.db

Create database automatically when app starts.

Use migrations or initialization script.

Seed default admin user:
username: admin
password: admin123
role: Admin

Password must be hashed.

### 9. Recommended App Pages

Create these pages:

Login
Dashboard
POS Panel
Products
Add/Edit Product
Users
Reports
Settings

### 10. UI Requirements
Use Tailwind CSS.

Design must be clean and simple.

Layout:

sidebar navigation
top bar with logged-in user
responsive desktop layout
large readable buttons for cashier
POS panel optimized for fast use



### 11. Technical Requirements

Use Electron main process for:

database access
file export
app window creation

Use Electron preload with IPC.

Do not access SQLite directly from React renderer.

Suggested structure:

src/
  main/
    main.js
    preload.js
    db.js
    services/
      authService.js
      productService.js
      saleService.js
      reportService.js
  renderer/
    src/
      App.jsx
      pages/
        Login.jsx
        Dashboard.jsx
        Pos.jsx
        Products.jsx
        Users.jsx
        Reports.jsx
      components/
      services/
        api.js
database/
  market_pos.db


### 12. IPC API Needed

Create safe IPC methods:

Auth:

auth:login
auth:getCurrentUser

Products:

products:getAll
products:getByBarcode
products:create
products:update
products:delete

Users:

users:getAll
users:create
users:update
users:delete

Sales:

sales:create
sales:getTodayTotal
sales:getByDateRange

Reports:

reports:exportSalesToExcel
reports:exportProductsToExcel


### 13. Important POS Logic

When barcode is scanned:

Read barcode from input.
Find product in SQLite.
If found, add to cart.
If already in cart, increase quantity.
Recalculate total.
Clear barcode input.
Keep input focused.

When sale is finished:

Validate cart is not empty.
Create sale.
Create sale items.
Reduce stock.
Clear cart.
Show success message.
14. Security
Hash passwords using bcrypt.
Use role-based access.
Do not expose raw database methods to renderer.
Use IPC only through preload.
Validate all inputs.
15. Final Result

The final app should allow a market owner to:

install and open the desktop app
login as admin or cashier
register products with barcode
scan products using barcode scanner
finish sales
see today's sales in euros
export sales/products to Excel
manage users and roles
