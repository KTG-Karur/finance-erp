import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Download } from 'lucide-react';

export default function PrintableCustomerDirectoryReport({
  borrowers = [],
  onClose,
  companyInfo = {
    name: 'KARUR THANGAMAYIL FINANCE PRIVATE LIMITED',
    tagline: '(A Non-Banking Financial Company Registered with Reserve Bank of India)',
    address: 'Regd Office: No. 123, Main Road, Near Bus Stand, Karur, Tamil Nadu - 639001',
    contact: 'Tel: +91 4324 234567 | Email: customercare@ktgfinance.com | Website: www.ktgfinance.com',
    reg: 'CIN: U65929TN2023PTC123456 | RBI Reg. No: B-07.01234'
  }
}) {
  const handlePrint = () => {
    window.print();
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const handleExportCsv = () => {
    const headers = [
      'S.No', 'Customer Code', 'Full Name', 'Father/Spouse Name', 'DOB', 'Gender', 'Occupation',
      'Mobile Phone', 'Alt Phone', 'Email', 'Address Line 1', 'City', 'State', 'Pincode',
      'Aadhaar Number', 'PAN Number', 'Bank Name', 'Account Number', 'IFSC Code', 'Loans Count', 'Total Outstanding', 'KYC Status'
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
      b.totalOutstanding || 0,
      b.kyc_status || 'PENDING'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Master_Directory_A4_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const reportRef = `REF/${new Date().getTime().toString().slice(-6)}`;

  const modalContent = (
    <div className="printable-form-overlay">

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

      {/* ISO A4 Paper Sheet - High-Density Customer Directory Sheet */}
      <div className="paper-sheet directory-report-paper">

        {/* 1. Official Letterhead Header */}
        <div className="bank-header-row">
          <div className="bank-logo-col">
            <div className="bank-emblem">KTG</div>
          </div>

          <div className="bank-title-col">
            <h1 className="bank-company-name">{companyInfo.name}</h1>
            <p className="bank-tagline">{companyInfo.tagline}</p>
            <p className="bank-contact-line">{companyInfo.address}</p>
            <p className="bank-contact-line">{companyInfo.contact}</p>
            <p className="bank-cin-line">{companyInfo.reg}</p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.68rem', lineHeight: '1.4' }}>
            <div><strong>Report Ref:</strong> {reportRef}</div>
            <div><strong>Date:</strong> {reportDate}</div>
            <div><strong>Total Customers:</strong> {borrowers.length}</div>
          </div>
        </div>

        {/* 2. Main Title Banner */}
        <div className="bank-title-banner">
          <span>Official Customer Directory Master Register</span>
        </div>

        {/* 3. High-Density Customer Records Data Table */}
        <div className="bank-section">
          <table className="directory-report-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '10%' }}>Customer Code</th>
                <th style={{ width: '18%' }}>Full Name & Guardian</th>
                <th style={{ width: '12%' }}>Mobile / Contact</th>
                <th style={{ width: '22%' }}>Residential Address & City</th>
                <th style={{ width: '14%' }}>Identity Documents</th>
                <th style={{ width: '10%' }}>Bank Account</th>
                <th style={{ width: '5%' }}>Loans</th>
                <th style={{ width: '10%' }}>Outstanding</th>
                <th style={{ width: '5%' }}>KYC</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>
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
                      <td className="val-mono" style={{ fontWeight: 700 }}>{b.borrower_code || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#000' }}>{b.full_name || '—'}</div>
                        {b.father_spouse_name && (
                          <div style={{ fontSize: '0.62rem', color: '#333' }}>S/o, W/o: {b.father_spouse_name}</div>
                        )}
                      </td>
                      <td className="val-mono">
                        <div>{b.phone || '—'}</div>
                        {(b.alt_phone || b.alternate_phone) && (
                          <div style={{ fontSize: '0.6rem', color: '#555' }}>Alt: {b.alt_phone || b.alternate_phone}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.64rem', lineHeight: '1.25' }}>
                        {addr || '—'}
                      </td>
                      <td className="val-mono" style={{ fontSize: '0.64rem' }}>
                        {b.aadhaar_number && <div>Aadhaar: {b.aadhaar_number}</div>}
                        {b.pan_number && <div>PAN: {b.pan_number}</div>}
                        {!b.aadhaar_number && !b.pan_number && '—'}
                      </td>
                      <td style={{ fontSize: '0.64rem' }}>{bankText || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.loansCount || 0}</td>
                      <td className="val-mono" style={{ textAlign: 'right', fontWeight: 700 }}>₹{fmt(b.totalOutstanding || 0)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.62rem' }}>
                        {b.kyc_status === 'VERIFIED' ? 'VERIFIED' : (b.kyc_status === 'REJECTED' ? 'REJECTED' : 'PENDING')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}
