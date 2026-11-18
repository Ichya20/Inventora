/**
 * Enterprise client-side CSV and document export utility.
 * Generates properly formatted UTF-8 CSVs with BOM for seamless Excel compatibility.
 */

export function exportTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function csvCell(cell: string | number | boolean | null | undefined): string {
  let text = cell == null ? '' : String(cell);
  // Spreadsheet applications can evaluate quoted CSV text as a formula.
  if (typeof cell === 'string' && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {

  const headerLine = headers.map(csvCell).join(',');
  const rowLines = rows.map(row => row.map(csvCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  exportTextFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Downloads a structured JSON file (e.g. for audit logs or ERP backup)
 */
export function exportToJson(filename: string, data: any): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
