import * as XLSX from 'xlsx';

export function exportToExcel(data, filename, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, ...data.map(row => String(row[key] || '').length + 2))
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
  return wb;
}

export function casesToRows(cases) {
  return cases.map(c => ({
    'Case Code': c.incidentCode || '',
    'Animal Type': c.animalType || '',
    'Status': c.status || '',
    'Workflow': c.workflowStatus || '',
    'Description': c.description || '',
    'NGO': c.ngoName || '',
    'Doctor': c.doctorName || '',
    'Rider': c.riderName || '',
    'Est. Cost': c.estimatedCost || 0,
    'Final Cost': c.finalCost || 0,
    'Payment Status': c.paymentStatus || '',
    'Created': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
  }));
}

export function accountsToRows(accounts) {
  return accounts.map(a => ({
    'Name': a._label || a.name || '',
    'Email': a.email || '',
    'Type': a._type || '',
    'Status': a.status || '',
    'Phone': a.phone || '',
    'Created': a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
  }));
}

export function expensesToRows(expenses) {
  return expenses.map(e => ({
    'Case Code': e.incidentCode || '',
    'Description': e.description || '',
    'Amount': e.amount || 0,
    'Category': e.category || '',
    'Date': e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
  }));
}
