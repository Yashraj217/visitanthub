import * as XLSX from 'xlsx';

/**
 * Export an array of row objects to a CSV file.
 */
export function exportToCSV(filename, columns, rows) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(c => escape(c.header)).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = typeof c.value === 'function' ? c.value(row) : row[c.key];
      return escape(val ?? '');
    }).join(',')
  );
  const csv  = [header, ...body].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
