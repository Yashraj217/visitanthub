import * as XLSX from 'xlsx';

/**
 * Export an array of row objects to an Excel file.
 * @param {string} filename  - e.g. 'visits-2026-06-16'
 * @param {string} sheetName - e.g. 'Visits'
 * @param {Array}  columns   - [{ header: 'Visitor Name', key: 'visitor_name' }, ...]
 * @param {Array}  rows      - array of data objects
 */
export function exportToExcel(filename, sheetName, columns, rows) {
  const headers = columns.map(c => c.header);
  const data = rows.map(row => columns.map(c => {
    const val = typeof c.value === 'function' ? c.value(row) : row[c.key];
    return val ?? '';
  }));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Auto column widths
  const colWidths = columns.map((c, i) => ({
    wch: Math.max(
      c.header.length,
      ...data.map(r => String(r[i] ?? '').length)
    ) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
