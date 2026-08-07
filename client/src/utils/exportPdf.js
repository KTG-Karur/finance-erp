// Real PDF generation (jsPDF + autotable) for the "Download PDF" action —
// unlike Print, this must never show the browser's print dialog, it just
// downloads a .pdf file straight away.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportReportPdf({
  company = {},
  reportTitle,
  reportSubtitle = '',
  filters = {},
  columns,
  rows,
  totalsRow = null,
  generatedBy = '',
  fileName
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 32;
  const centerX = pageWidth / 2;
  let cursorY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.name || 'Finance ERP', centerX, cursorY, { align: 'center' });
  cursorY += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const companyLines = [
    company.address,
    [company.phone ? `Ph: ${company.phone}` : null, company.email].filter(Boolean).join('  |  '),
    [company.gstin ? `GSTIN: ${company.gstin}` : null, company.pan ? `PAN: ${company.pan}` : null].filter(Boolean).join('  |  ')
  ].filter(Boolean);
  companyLines.forEach(line => {
    doc.text(line, centerX, cursorY, { align: 'center' });
    cursorY += 11;
  });

  cursorY += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(reportTitle || 'Report', centerX, cursorY, { align: 'center' });
  cursorY += 14;

  if (reportSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(reportSubtitle, centerX, cursorY, { align: 'center' });
    doc.setTextColor(0);
    cursorY += 14;
  }

  const filtersLine = Object.entries(filters)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('   |   ');
  if (filtersLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(filtersLine, centerX, cursorY, { align: 'center', maxWidth: pageWidth - marginX * 2 });
    doc.setTextColor(0);
    cursorY += 16;
  }

  const now = new Date();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generated ${now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${generatedBy ? ` by ${generatedBy}` : ''}`,
    centerX, cursorY, { align: 'center' }
  );
  doc.setTextColor(0);
  cursorY += 10;

  const body = rows.length === 0 ? [['No records found for the selected filters.']] : rows;
  const colSpanForEmpty = rows.length === 0 ? { 0: { colSpan: columns.length, halign: 'center' } } : {};

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [columns.map(c => c.label)],
    body,
    foot: totalsRow ? [totalsRow] : undefined,
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.align === 'right') acc[i] = { halign: 'right' };
      return acc;
    }, {}),
    cellStyles: colSpanForEmpty,
    styles: {
      fontSize: columns.length > 14 ? 6.5 : columns.length > 10 ? 7.5 : columns.length > 6 ? 8.5 : 9.5,
      cellPadding: columns.length > 10 ? 3 : 5,
      textColor: 20, lineColor: 200, lineWidth: 0.5, overflow: 'linebreak'
    },
    headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold', lineColor: 200, lineWidth: 0.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold', lineColor: 200, lineWidth: 0.5 },
    theme: 'grid'
  });

  const safeName = fileName || (reportTitle || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  doc.save(`${safeName}.pdf`);
}
