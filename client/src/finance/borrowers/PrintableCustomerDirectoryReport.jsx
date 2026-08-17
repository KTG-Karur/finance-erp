import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Download } from 'lucide-react';

export default function PrintableCustomerDirectoryReport({
  borrowers = [],
  onClose,
  tenant
}) {
  const companyInfo = {
    name: tenant?.name || 'Your Company',
    tagline: 'Non-Banking Financial Company',
    address: tenant?.address || '',
    contact: tenant?.phone ? `Tel: ${tenant.phone}` : '',
    reg: [tenant?.gstin && `GSTIN: ${tenant.gstin}`, tenant?.pan && `PAN: ${tenant.pan}`].filter(Boolean).join(' | ')
  };

  const handlePrint = () => {
    window.print();
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const handleExportCsv = () => {
    const headers = [
      'S.No', 'Customer Code', 'Full Name', 'Father/Spouse Name', 'DOB', 'Gender', 'Occupation',
      'Mobile Phone', 'Alt Phone', 'Email', 'Address Line 1', 'City', 'State', 'Pincode',
      'Aadhaar Number', 'PAN Number', 'Bank Name', 'Account Number', 'IFSC Code', 'Loans Count', 'Total Outstanding'
    ];

    const rows = borrowers.map((b, idx) => [
      idx + 1,
      b.borrower_code || '',
      b.full_name || '',
      b.father_spouse_name || '',
      b.dob || '',
      b.gender || '',
      b.occupation || '',
      b.phone || '',
      b.alt_phone || b.alternate_phone || '',
      b.email || '',
      b.address_line1 || b.street_address || b.address || '',
      b.city || '',
      b.state || '',
      b.pincode || '',
      b.aadhaar_number || '',
      b.pan_number || '',
      b.bank_name || '',
      b.bank_account_no || b.account_number || '',
      b.bank_ifsc || '',
      b.loansCount || 0,
      b.totalOutstanding || 0
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customer_Master_Directory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const reportRef = `REF/${new Date().getTime().toString().slice(-6)}`;

  const modalContent = (
    <div className="printable-form-overlay">

      <style>{`
        .directory-report-paper {
          width: 297mm;
          min-height: 210mm;
          background: #FFFFFF;
          margin: 20px auto;
          padding: 12mm 14mm;
          box-shadow: 0 14px 40px rgba(0,0,0,0.25);
          box-sizing: border-box;
          color: #000000;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
          border: 2px solid #0F172A;
          border-radius: 4px;
        }

        .directory-inner-border {
          border: 1px solid #94A3B8;
          padding: 16px 18px;
          min-height: 100%;
          box-sizing: border-box;
        }

        .directory-report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.73rem;
          margin-top: 14px;
        }

        .directory-report-table th,
        .directory-report-table td {
          border: 1px solid #CBD5E1;
          padding: 7px 9px;
          vertical-align: top;
        }

        .directory-report-table th {
          background: #F1F5F9;
          color: #0F172A;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.03em;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          body { background: #FFFFFF !important; }
          .printable-form-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
          .printable-form-floating-btns { display: none !important; }
          .directory-report-paper {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .directory-inner-border {
            border: 2px solid #000000 !important;
            padding: 10px !important;
          }
          .directory-report-table th,
          .directory-report-table td {
            border: 1px solid #000000 !important;
          }
        }
      `}</style>

      {/* Floating Action Controls (Hidden on Print) */}
      <div className="printable-form-floating-btns">
        <button type="button" onClick={onClose} className="btn-close" title="Back to Directory">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          <span>Back to Directory</span>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleExportCsv} className="btn-close">
            <Download style={{ width: 15, height: 15 }} />
            <span>Export CSV</span>
          </button>

          <button type="button" onClick={handlePrint} className="btn-print">
            <Printer style={{ width: 15, height: 15 }} />
            <span>Print Customer Directory</span>
          </button>
        </div>
      </div>

      {/* A4 Landscape Paper Sheet with Double Page Border Frame */}
      <div className="paper-sheet directory-report-paper">
        <div className="directory-inner-border">

          {/* 1. Official Centered Company Letterhead */}
          <div style={{ textAlign: 'center', paddingBottom: 10, marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              {companyInfo.name}
            </h1>
            {companyInfo.tagline && (
              <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
                {companyInfo.tagline}
              </p>
            )}
            <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#334155' }}>
              {companyInfo.address}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748B' }}>
              {companyInfo.contact}
            </p>
            {companyInfo.reg && (
              <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>
                {companyInfo.reg}
              </p>
            )}

            {/* Centered Dual Accent Line Divider */}
            <div style={{ marginTop: 10, borderBottom: '2px solid #002B49', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: -2, left: '35%', right: '35%', borderBottom: '2px solid #EAB308' }} />
            </div>
          </div>

          {/* 2. Centered Main Report Title & Metadata Banner */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ display: 'inline-block', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 24px', borderRadius: 6 }}>
              <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A' }}>
                OFFICIAL CUSTOMER DIRECTORY MASTER REGISTER
              </h2>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.74rem', color: '#475569', marginTop: 8 }}>
              <span><strong>Report Ref:</strong> {reportRef}</span>
              <span>•</span>
              <span><strong>Generated Date:</strong> {reportDate}</span>
              <span>•</span>
              <span><strong>Total Registered Customers:</strong> {borrowers.length}</span>
            </div>
          </div>

          {/* 3. High-Density Customer Records Data Table */}
          <div>
            <table className="directory-report-table">
              <thead>
                <tr>
                  <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                  <th style={{ width: '10%' }}>Customer Code</th>
                  <th style={{ width: '18%' }}>Full Name & Guardian</th>
                  <th style={{ width: '12%' }}>Mobile / Contact</th>
                  <th style={{ width: '22%' }}>Residential Address & City</th>
                  <th style={{ width: '14%' }}>Identity Documents</th>
                  <th style={{ width: '10%' }}>Bank Account</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>Loans</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>
                      No customer records found in directory.
                    </td>
                  </tr>
                ) : (
                  borrowers.map((b, idx) => {
                    const addr = [b.address_line1 || b.street_address || b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ');
                    const bankText = [b.bank_name, b.account_number ? `A/C: ${b.account_number}` : ''].filter(Boolean).join(' - ');

                    return (
                      <tr key={b.id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.borrower_code || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {(b.photo || b.profile_image) ? (
                              <img
                                src={b.photo || b.profile_image}
                                alt=""
                                style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid #94A3B8', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #94A3B8', background: '#F1F5F9', color: '#475569', fontSize: '0.58rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {(b.full_name || '?').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#000' }}>{b.full_name || '—'}</div>
                              {b.father_spouse_name && (
                                <div style={{ fontSize: '0.62rem', color: '#475569' }}>S/o, W/o: {b.father_spouse_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          <div>{b.phone || '—'}</div>
                          {(b.alt_phone || b.alternate_phone) && (
                            <div style={{ fontSize: '0.6rem', color: '#64748B' }}>Alt: {b.alt_phone || b.alternate_phone}</div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.66rem', lineHeight: '1.3' }}>
                          {addr || '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                          {b.aadhaar_number && <div>Aadhaar: {b.aadhaar_number}</div>}
                          {b.pan_number && <div>PAN: {b.pan_number}</div>}
                          {!b.aadhaar_number && !b.pan_number && '—'}
                        </td>
                        <td style={{ fontSize: '0.65rem' }}>{bankText || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.loansCount || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{fmt(b.totalOutstanding || 0)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Official Verification Footer */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.74rem', color: '#475569' }}>
            <div>
              <div><strong>Prepared By:</strong> System Admin</div>
              <div style={{ fontSize: '0.68rem', fontStyle: 'italic', marginTop: 2 }}>Generated on: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <div style={{ textAlign: 'center', borderTop: '1px solid #000000', width: 200, paddingTop: 4 }}>
              <strong>Authorized Signatory</strong>
              <div style={{ fontSize: '0.66rem', color: '#64748B' }}>(Stamp & Signature)</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}
