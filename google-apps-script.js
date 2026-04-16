// ==========================================================
// Google Apps Script - Backend for T-Shirt Order System
// ==========================================================
// HOW TO SET UP:
// 1. Go to https://sheets.google.com → Create new spreadsheet
// 2. Name it "הזמנות חולצות"
// 3. Go to Extensions → Apps Script
// 4. Delete everything and paste this entire file
// 5. Click Deploy → New deployment
// 6. Type: "Web app"
// 7. Execute as: "Me"
// 8. Who has access: "Anyone"
// 9. Click Deploy → Copy the URL
// 10. Paste that URL into config.js (APPS_SCRIPT_URL)
// ==========================================================

const SHEET_NAME = 'Orders';
const ADMIN_PASSWORD = 'bgood2024'; // Change this!

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;

  let result;
  try {
    switch (action) {
      case 'submit':
        result = submitOrder(e);
        break;
      case 'getOrders':
        result = getOrders(params.password);
        break;
      case 'deleteOrder':
        result = deleteOrder(params.row, params.password);
        break;
      case 'getConfig':
        result = getConfig();
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'timestamp', 'familyName', 'familyContact', 'memberName',
      'shirtType', 'color', 'sizeCategory', 'size', 'quantity', 'notes'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }
  return sheet;
}

function submitOrder(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = getOrCreateSheet();

  const orders = data.orders;
  if (!orders || orders.length === 0) {
    return { success: false, error: 'No orders provided' };
  }

  const timestamp = new Date().toLocaleString('he-IL');

  orders.forEach(order => {
    sheet.appendRow([
      timestamp,
      data.familyName,
      data.familyContact,
      order.memberName || '-',
      order.shirtType,
      order.color,
      order.sizeCategory,
      order.size,
      order.quantity,
      order.notes || ''
    ]);
  });

  return { success: true, message: `${orders.length} items saved` };
}

function getOrders(password) {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Wrong password' };
  }

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, orders: [], families: [] };
  }

  const headers = data[0];
  const orders = [];
  const familyMap = {};

  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => { row[h] = data[i][j]; });
    row._row = i + 1;
    orders.push(row);

    const fKey = row.familyName;
    if (!familyMap[fKey]) {
      familyMap[fKey] = { name: row.familyName, contact: row.familyContact, orders: [] };
    }
    familyMap[fKey].orders.push(row);
  }

  return {
    success: true,
    orders: orders,
    families: Object.values(familyMap)
  };
}

function deleteOrder(rowNum, password) {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Wrong password' };
  }
  const sheet = getOrCreateSheet();
  sheet.deleteRow(parseInt(rowNum));
  return { success: true };
}

function getConfig() {
  return {
    success: true,
    config: {
      title: 'הזמנת חולצות משפחתית',
      active: true
    }
  };
}
