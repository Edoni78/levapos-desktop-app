/**
 * Albanian API / validation messages (main process)
 */
export const ERR = {
  forbidden: 'E ndaluar',
  unauthorized: 'I paautorizuar',
  requiredUsernamePassword: 'Kërkohen emri i përdoruesit dhe fjalëkalimi',
  invalidLogin: 'Emër përdoruesi ose fjalëkalim i pavlefshëm',
  invalidUsernamePassword: 'Emër përdoruesi ose fjalëkalim i pavlefshëm',

  invalidFullName: 'Emër i plotë i pavlefshëm',
  invalidUsername: 'Emër përdoruesi i pavlefshëm',
  passwordMin: 'Fjalëkalimi duhet të ketë të paktën 4 karaktere',
  usernameExists: 'Ky emër përdoruesi ekziston tashmë',
  invalidUserId: 'ID përdoruesi i pavlefshëm',
  userNotFound: 'Përdoruesi nuk u gjet',
  cannotRemoveLastAdmin: 'Nuk mund të hiqet administratori i fundit',
  cannotDeleteOwnAccount: 'Nuk mund të fshini llogarinë tuaj',
  cannotDeleteLastAdmin: 'Nuk mund të fshihet administratori i fundit',

  barcodeRequired: 'Kërkohet barkodi',
  invalidProductName: 'Emër produkti i pavlefshëm',
  invalidBarcode: 'Barkod i pavlefshëm',
  invalidPrice: 'Çmim i pavlefshëm',
  invalidStock: 'Sasi stoku e pavlefshme',
  barcodeExists: 'Barkodi ekziston tashmë',
  invalidProductId: 'ID produkti i pavlefshëm',
  productNotFound: 'Produkti nuk u gjet',

  invalidDate: 'Datë e pavlefshme',
  datesRequired: 'Kërkohen data e fillimit dhe e mbarimit',
  cartEmpty: 'Shporta nuk mund të jetë bosh',
  invalidCartLine: 'Rresht i pavlefshëm në shportë',
  invalidQuantity: 'Sasi e pavlefshme',
  insufficientStock: (name) => `Stoku nuk mjafton për: ${name}`,
  saleNotRecorded: 'Shitja nuk u regjistrua',
  adminPasswordRequired: 'Kërkohet fjalëkalimi i administratorit',
  invalidAdminPassword: 'Fjalëkalimi i administratorit është i gabuar',
  noSalesInRange: 'Nuk ka shitje për të fshirë në këtë interval',
}

/** Tekste për eksporte Excel */
export const EXCEL = {
  dialogFilter: 'Skedar Excel',
  sales: {
    saveTitle: 'Eksporto shitjet në Excel',
    sheetName: 'Shitjet',
    columns: [
      { header: 'ID shitjes', key: 'saleId', width: 10 },
      { header: 'Arkëtari', key: 'cashier', width: 22 },
      { header: 'Produkti', key: 'product', width: 28 },
      { header: 'Barkodi', key: 'barcode', width: 18 },
      { header: 'Sasia', key: 'qty', width: 10 },
      { header: 'Çmimi për njësi (€)', key: 'unit', width: 16 },
      { header: 'Totali i rreshtit (€)', key: 'line', width: 14 },
      { header: 'Totali i shitjes (€)', key: 'saleTotal', width: 14 },
      { header: 'Data dhe ora', key: 'date', width: 22 },
    ],
    footerDayTotal: (dateStr) => `Totali për datën ${dateStr} (€)`,
    footerGrandRange: 'Totali i përgjithshëm i intervalit (€)',
    footerGrandSingleDay: 'Totali i ditës (€)',
    footerSaleCount: 'Numri i shitjeve',
  },
  products: {
    saveTitle: 'Eksporto produktet në Excel',
    sheetName: 'Produktet',
    columns: [
      { header: 'Nr.', key: 'id', width: 8 },
      { header: 'Emri', key: 'name', width: 30 },
      { header: 'Barkodi', key: 'barcode', width: 18 },
      { header: 'Blerje (€)', key: 'costPrice', width: 12 },
      { header: 'Shitje (€)', key: 'price', width: 12 },
      { header: 'Fitim (€)', key: 'profit', width: 12 },
      { header: 'Stoku', key: 'stock', width: 10 },
      { header: 'Krijuar më', key: 'created', width: 22 },
      { header: 'Përditësuar më', key: 'updated', width: 22 },
    ],
    footerProductCount: 'Numri i produkteve',
  },
}
