import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileDown } from 'lucide-react';
import { exportReportPdf } from '../utils/exportPdf';

// On-screen "paper" preview shown before Print or Export PDF actually happens —
// reuses the .printable-form-overlay print-isolation machinery (hides #root,
// shows only this) so Print here only ever prints this sheet, and Download PDF
// never opens the browser's print dialog — it downloads a .pdf file directly.
//
// The on-screen sheet is sized to match a real A4 page (210mm) so what you see
// is what prints. Columns get a smaller font as the column count grows, and
// text wraps at word boundaries only (never mid-word) — a long single value
// may run past its column rather than get chopped into broken fragments.
export default function ReportPreviewModal({
  company = {},
  reportTitle,
  reportSubtitle = '',
  filters = {},
  columns,
  rows,
  totalsRow = null,
  generatedBy = '',
  onClose
}) {
  const filterEntries = Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const now = new Date();
  const tableFontSize = columns.length > 14 ? '7pt' : columns.length > 10 ? '8pt' : columns.length > 6 ? '8.8pt' : '9.6pt';
  const cellPadding = columns.length > 10 ? '2px 5px' : '3px 8px';

  const content = (
    <div className="printable-form-overlay">
      <div className="printable-form-floating-btns">
        <button type="button" className="btn-close" onClick={onClose}>
          <X style={{ width: 14, height: 14 }} />
          <span>Close</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-print" onClick={() => exportReportPdf({ company, reportTitle, reportSubtitle, filters, columns, rows, totalsRow, generatedBy })}>
            <FileDown style={{ width: 14, height: 14 }} />
            <span>Download PDF</span>
          </button>
          <button type="button" className="btn-print" onClick={() => window.print()}>
            <Printer style={{ width: 14, height: 14 }} />
            <span>Print</span>
          </button>
        </div>
      </div>

      <style>{`
        /* On screen the sheet can be wider than a physical page — that's the
           only way to stop a receipt-no-style column from wrapping without
           shrinking the print/PDF output, which stays a real A4 landscape
           page (see the @media print override below). */
        .report-preview-paper {
          width: min(1300px, 92vw);
          max-width: 100%;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto 60px auto;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .report-preview-table {
          table-layout: fixed;
          width: 100%;
          font-size: ${tableFontSize};
        }
        .report-preview-table td, .report-preview-table th {
          padding: ${cellPadding};
          white-space: normal;
          word-break: normal;
          /* Normal words never break — this only kicks in as a last resort,
             when a single value is wider than its column and would otherwise
             spill into the next one. */
          overflow-wrap: break-word;
          line-height: 1.25;
        }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .report-preview-paper {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="report-preview-paper" style={{ padding: '16mm', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif', color: '#000000' }}>
        {/* Centered letterhead */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: 12, marginBottom: 16 }}>
          {company.logo && <img src={company.logo} alt="" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 6px auto', display: 'block' }} />}
          <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.01em' }}>{company.name || 'Finance ERP'}</div>
          {company.address && <div style={{ fontSize: '0.76rem', color: '#333333', marginTop: 3 }}>{company.address}</div>}
          {(company.phone || company.email || company.gstin || company.pan) && (
            <div style={{ fontSize: '0.72rem', color: '#333333', marginTop: 2 }}>
              {[
                company.phone ? `Ph: ${company.phone}` : null,
                company.email,
                company.gstin ? `GSTIN: ${company.gstin}` : null,
                company.pan ? `PAN: ${company.pan}` : null
              ].filter(Boolean).join('  |  ')}
            </div>
          )}
        </div>

        {/* Report content */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 3px 0', fontSize: '1.05rem', fontWeight: 700 }}>{reportTitle}</h2>
          {reportSubtitle && <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#555555' }}>{reportSubtitle}</p>}
          {filterEntries.length > 0 && (
            <div style={{ fontSize: '0.74rem', color: '#333333' }}>
              {filterEntries.map(([k, v], i) => (
                <span key={k}>
                  {i > 0 && <span style={{ margin: '0 8px', color: '#999999' }}>|</span>}
                  {k}: <strong>{v}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        <table className="report-preview-table" style={{ borderCollapse: 'collapse' }}>
          <colgroup>
            {columns.map((c, i) => <col key={i} style={{ width: `${100 / columns.length}%` }} />)}
          </colgroup>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.label} style={{ border: '1px solid #333333', background: '#F1F5F9', textAlign: c.align === 'right' ? 'right' : 'left' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ border: '1px solid #333333', padding: '18px 6px', textAlign: 'center', color: '#666666' }}>No records found for the selected filters.</td></tr>
            ) : rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #333333', textAlign: columns[ci]?.align === 'right' ? 'right' : 'left' }}>{cell}</td>
                ))}
              </tr>
            ))}
            {totalsRow && (
              <tr style={{ fontWeight: 700, background: '#F1F5F9' }}>
                {totalsRow.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #333333', textAlign: columns[ci]?.align === 'right' ? 'right' : 'left' }}>{cell}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 14, fontSize: '0.68rem', color: '#666666', textAlign: 'center' }}>
          Generated {now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{generatedBy ? ` by ${generatedBy}` : ''}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
