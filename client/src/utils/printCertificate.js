// Dedicated black-and-white printable Fixed Deposit certificate — opened in its
// own tab (same technique as printReport.js) so the printed page is just the
// certificate, not the whole app chrome, with a proper company letterhead and a
// decorative double-border "certificate" frame instead of a plain data card.

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function openPrintableCertificate({ company = {}, fd, labels }) {
  const companyName = company.name || 'Finance ERP';
  const companyDetailLines = [
    company.address || null,
    [company.phone ? `Ph: ${company.phone}` : null, company.email || null].filter(Boolean).join('  |  ') || null,
    company.gstin ? `GSTIN: ${company.gstin}` : null
  ].filter(Boolean);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const isPremature = fd.status === 'CLOSED_PREMATURE';
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const rows = [
    [labels.fdAccountNo, fd.fd_account_no],
    [labels.customer, fd.customer_name],
    [labels.principal, `₹${fmt(fd.principal_amount)}`],
    [labels.rate, `${fd.interest_rate}% p.a.`],
    [labels.tenure, `${fd.tenure_months} ${labels.months}`],
    [labels.scheme, fd.scheme === 'CUMULATIVE' ? labels.cumulative : labels.monthlyPayout],
    [labels.bookingDate, fd.booking_date],
    [labels.maturityDate, fd.maturity_date],
    fd.nominee_name ? [labels.nominee, fd.nominee_name] : null,
    [labels.status, labels.statusText]
  ].filter(Boolean);

  const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(labels.title)} — ${escapeHtml(fd.fd_account_no)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 14mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
    font-size: 12px;
  }
  .cert-frame {
    border: 3px double #000;
    padding: 28px 34px;
    min-height: 240mm;
    display: flex;
    flex-direction: column;
  }
  .cert-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .company-name { font-size: 19px; font-weight: 700; letter-spacing: 0.02em; }
  .company-details { font-size: 10px; color: #333; margin-top: 4px; line-height: 1.5; }
  .cert-title {
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 6px 0 4px 0;
  }
  .cert-subtitle { text-align: center; font-size: 10px; color: #444; margin-bottom: 20px; }
  .cert-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
  .cert-table td { border: 1px solid #000; padding: 8px 12px; }
  .cert-table td.label { width: 40%; font-weight: 700; background: #F2F2F2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cert-maturity-box {
    border: 2px solid #000;
    text-align: center;
    padding: 16px;
    margin: 6px 0 24px 0;
  }
  .cert-maturity-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #333; }
  .cert-maturity-box .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .cert-signatures {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 40px;
  }
  .cert-sign-block { text-align: center; width: 220px; }
  .cert-sign-line { border-top: 1px solid #000; padding-top: 6px; font-size: 10px; }
  .cert-footer { text-align: center; font-size: 9px; color: #555; margin-top: 16px; }
  @media screen {
    body { padding: 24px; max-width: 820px; margin: 0 auto; }
  }
</style>
</head>
<body>
  <div class="cert-frame">
    <div class="cert-header">
      <div class="company-name">${escapeHtml(companyName)}</div>
      ${companyDetailLines.length ? `<div class="company-details">${companyDetailLines.map(l => escapeHtml(l)).join('<br />')}</div>` : ''}
    </div>

    <div class="cert-title">${escapeHtml(labels.title)}</div>
    <div class="cert-subtitle">${escapeHtml(labels.certificateNo)}: ${escapeHtml(fd.fd_account_no)}</div>

    <table class="cert-table">
      ${rows.map(([label, value]) => `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}
    </table>

    <div class="cert-maturity-box">
      <div class="label">${escapeHtml(isPremature ? labels.payoutAfterPenalty : labels.maturityValue)}</div>
      <div class="value">₹${fmt(isPremature ? fd.payout_amount : fd.maturity_value)}</div>
    </div>

    <div class="cert-signatures">
      <div class="cert-sign-block">
        <div class="cert-sign-line">${escapeHtml(labels.customerSignature)}</div>
      </div>
      <div class="cert-sign-block">
        <div class="cert-sign-line">${escapeHtml(labels.authorizedSignatory)}</div>
      </div>
    </div>

    <div class="cert-footer">${escapeHtml(labels.generatedOn)}: ${escapeHtml(now)}</div>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(doc);
  printWindow.document.close();
}
