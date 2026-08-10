import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { calculatePaymentAllocation, generateCustomSchedule } from '../utils/loanCalculations';

const MILESTONE_DAYS = [1, 7, 15, 30];

const fmt = n => Number(n || 0).toLocaleString('en-IN');

// Shared duration preview used by both CustomFormulaModal (while authoring a library
// formula) and the Scheme modal's estimate panel (while attaching one to a scheme) —
// written once so both places show identical numbers, computed by the same real
// engine (calculatePaymentAllocation / generateCustomSchedule), never a separate
// simplified formula.
export default function FormulaDurationPreview({
  accrualMode,
  interestFormulaTokens,
  installmentFormulaTokens,
  rate,
  repaymentFrequency,
  tenureMonths
}) {
  const [sampleAmount, setSampleAmount] = useState(100000);
  const numericRate = Number(rate);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let content = null;

  if (!numericRate || numericRate <= 0 || !interestFormulaTokens?.length) {
    content = (
      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
        Enter a rate and finish the interest formula to see a duration estimate.
      </p>
    );
  } else if (accrualMode === 'SCHEDULED') {
    if (!installmentFormulaTokens?.length) {
      content = (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
          Finish the installment formula to see a schedule.
        </p>
      );
    } else {
      const fullSchedule = generateCustomSchedule({
        principal: sampleAmount,
        monthlyInterestRate: numericRate,
        tenureMonths: Number(tenureMonths) || 6,
        repaymentFrequency: repaymentFrequency || 'DAILY',
        interestFormula: interestFormulaTokens,
        installmentFormula: installmentFormulaTokens,
        startDate: todayStr
      });
      const shown = fullSchedule.slice(0, 8);
      const remaining = fullSchedule.length - shown.length;
      const rowError = shown.find(row => row.error)?.error;

      content = (
        <>
          {rowError && <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: '#DC2626' }}>{rowError}</p>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#64748B' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Period</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Due Date</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Principal</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Interest</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Installment</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(row => (
                  <tr key={row.period} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '4px 6px', color: '#334155' }}>{row.period}</td>
                    <td style={{ padding: '4px 6px', color: '#334155' }}>{row.due_date}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: '#334155' }}>₹{fmt(row.principal)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: '#334155' }}>₹{fmt(row.interest)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: '#0F172A', fontWeight: 500 }}>₹{fmt(row.emi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {remaining > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>+{remaining} more period(s)</p>
          )}
        </>
      );
    }
  } else {
    const rows = MILESTONE_DAYS.map(day => {
      const paymentDate = new Date(today);
      paymentDate.setDate(paymentDate.getDate() + day);
      const result = calculatePaymentAllocation({
        loan: {
          principal_amount: sampleAmount,
          pending_amount: sampleAmount,
          monthly_interest_rate: numericRate,
          formula_type: 'CUSTOM',
          accrual_mode: 'LIVE',
          interest_formula: interestFormulaTokens,
          loan_date: todayStr,
          last_payment_date: null
        },
        paymentAmount: 0,
        paymentDate: paymentDate.toISOString().slice(0, 10)
      });
      return { day, interestDue: result.interestDue, error: result.error };
    });
    const rowError = rows.find(r => r.error)?.error;

    content = (
      <>
        {rowError && <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: '#DC2626' }}>{rowError}</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748B' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>If Unpaid For</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Interest Owed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.day} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '4px 6px', color: '#334155' }}>Day {r.day}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: '#0F172A', fontWeight: 500 }}>₹{fmt(r.interestDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator style={{ width: 14, height: 14, color: '#475569' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>Estimate Preview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Sample amount</span>
          <input
            type="number"
            min="0"
            value={sampleAmount}
            onChange={e => setSampleAmount(Number(e.target.value) || 0)}
            style={{ width: 110, height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', color: '#0F172A' }}
          />
        </div>
      </div>
      {content}
    </div>
  );
}
