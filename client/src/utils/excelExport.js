// Native formatted Excel (.xls / XML Spreadsheet) export utility
// Produces clean, formatted Microsoft Excel workbooks with styled headers, gridlines,
// bold totals, and proper numeric cell formatting without external heavyweight dependencies.

export function exportToExcel({
  filename = 'report.xls',
  sheetName = 'Sheet1',
  reportTitle = 'Report',
  companyName = 'Financial ERP',
  filters = {},
  headers = [],
  rows = [],
  totalsRow = null
}) {
  const sanitize = (val) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const filterRowsHtml = Object.entries(filters || {})
    .filter(([_, val]) => Boolean(val) && val !== '—')
    .map(([key, val]) => `<tr><td style="font-weight: bold; color: #475569; padding: 4px 8px; border: none;">${sanitize(key)}:</td><td style="color: #0F172A; padding: 4px 8px; border: none;">${sanitize(val)}</td></tr>`)
    .join('');

  const tableHeaderHtml = headers
    .map(h => {
      const label = typeof h === 'object' ? (h.label || '') : String(h);
      const align = typeof h === 'object' && h.align ? h.align : 'left';
      return `<th style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; padding: 10px 12px; border: 1px solid #334155; text-align: ${align}; font-size: 11pt;">${sanitize(label)}</th>`;
    })
    .join('');

  const tableRowsHtml = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const cells = row.map((cell, cIdx) => {
        const align = headers[cIdx] && typeof headers[cIdx] === 'object' && headers[cIdx].align ? headers[cIdx].align : 'left';
        return `<td style="background-color: ${bg}; padding: 8px 12px; border: 1px solid #CBD5E1; text-align: ${align}; color: #0F172A; font-size: 10pt;">${sanitize(cell)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const totalsHtml = totalsRow ? `
    <tr style="font-weight: bold; background-color: #F1F5F9;">
      ${totalsRow.map((cell, cIdx) => {
        const align = headers[cIdx] && typeof headers[cIdx] === 'object' && headers[cIdx].align ? headers[cIdx].align : 'left';
        return `<td style="padding: 10px 12px; border: 2px solid #94A3B8; text-align: ${align}; color: #0F172A; font-size: 10.5pt;">${sanitize(cell)}</td>`;
      }).join('')}
    </tr>
  ` : '';

  const excelXml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sanitize(sheetName)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <table style="margin-bottom: 16px;">
          <tr>
            <td colspan="${headers.length || 6}" style="font-size: 16pt; font-weight: bold; color: #1E293B; padding: 6px 0;">
              ${sanitize(companyName)}
            </td>
          </tr>
          <tr>
            <td colspan="${headers.length || 6}" style="font-size: 13pt; font-weight: bold; color: #15803D; padding: 4px 0;">
              ${sanitize(reportTitle)}
            </td>
          </tr>
          <tr>
            <td colspan="${headers.length || 6}" style="font-size: 9pt; color: #64748B; padding-bottom: 12px;">
              Generated on: ${new Date().toLocaleString('en-IN')}
            </td>
          </tr>
          ${filterRowsHtml ? `<tr><td colspan="${headers.length || 6}" style="height: 8px;"></td></tr>${filterRowsHtml}<tr><td colspan="${headers.length || 6}" style="height: 12px;"></td></tr>` : ''}
        </table>

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${totalsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `.trim();

  const finalFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
