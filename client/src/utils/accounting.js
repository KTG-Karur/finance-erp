// Double-entry accounting engine. Every journal entry must balance (total debit ===
// total credit) or it is rejected at creation time — this is what makes the Cash
// Book, General Ledger, Trial Balance, P&L, and Balance Sheet screens arithmetically
// guaranteed to reconcile with each other, since they are all just different views
// over the same journal_lines rather than separately hand-maintained numbers.

export const ACCOUNT_TYPES = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  REVENUE: 'CREDIT'
};

export function journalLine(account_code, debit = 0, credit = 0) {
  return { account_code, debit: Number(debit) || 0, credit: Number(credit) || 0 };
}

// Throws on an unbalanced entry rather than silently accepting it — a bug that lets
// debit != credit through would corrupt every downstream report.
export function buildJournalEntry({ id, date, narration, lines, ref_type, ref_id, branch, voucher_type, created_by }) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.round((totalDebit - totalCredit) * 100) !== 0) {
    throw new Error(`Unbalanced journal entry "${narration}": Dr ${totalDebit} vs Cr ${totalCredit}`);
  }
  return {
    id,
    date,
    narration,
    lines,
    ref_type: ref_type || 'MANUAL',
    ref_id: ref_id ?? null,
    branch: branch || null,
    voucher_type: voucher_type || null,
    created_by: created_by || null,
    created_at: new Date().toISOString()
  };
}

// Auto vouchers are ones the system posts on its own (a collection, a disbursal, an
// expense) — anything with ref_type !== 'MANUAL'. Manual vouchers are the ones a
// staff member deliberately keyed in through the voucher form.
export function isAutoVoucher(je) {
  return je.ref_type !== 'MANUAL';
}

export const MANUAL_VOUCHER_TYPES = ['CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT', 'CONTRA', 'JOURNAL'];

// Turns a simple voucher form (type + amount + the "other" account) into balanced
// journal lines, so the person filling the form never has to think in Dr/Cr terms
// for the common cases — only "Journal (Record Only)" asks for raw lines directly.
export function buildVoucherLines(voucherType, { amount, otherAccountCode, contraDirection, lines } = {}) {
  const amt = Number(amount) || 0;
  switch (voucherType) {
    case 'CASH_RECEIPT':
      return [journalLine('1001', amt, 0), journalLine(otherAccountCode, 0, amt)];
    case 'CASH_PAYMENT':
      return [journalLine(otherAccountCode, amt, 0), journalLine('1001', 0, amt)];
    case 'BANK_RECEIPT':
      return [journalLine('1002', amt, 0), journalLine(otherAccountCode, 0, amt)];
    case 'BANK_PAYMENT':
      return [journalLine(otherAccountCode, amt, 0), journalLine('1002', 0, amt)];
    case 'CONTRA':
      return contraDirection === 'BANK_TO_CASH'
        ? [journalLine('1001', amt, 0), journalLine('1002', 0, amt)]
        : [journalLine('1002', amt, 0), journalLine('1001', 0, amt)];
    case 'JOURNAL':
      return (lines || []).map(l => journalLine(l.account_code, l.debit, l.credit));
    default:
      return [];
  }
}

export function computeAccountBalances(chartOfAccounts, journalEntries) {
  const totals = {};
  chartOfAccounts.forEach(a => { totals[a.code] = { debit: 0, credit: 0 }; });
  journalEntries.forEach(je => {
    je.lines.forEach(l => {
      if (!totals[l.account_code]) totals[l.account_code] = { debit: 0, credit: 0 };
      totals[l.account_code].debit += l.debit || 0;
      totals[l.account_code].credit += l.credit || 0;
    });
  });
  return chartOfAccounts.map(a => {
    const t = totals[a.code] || { debit: 0, credit: 0 };
    const normalSide = ACCOUNT_TYPES[a.type] || 'DEBIT';
    const balance = normalSide === 'DEBIT' ? (t.debit - t.credit) : (t.credit - t.debit);
    return { ...a, normal_side: normalSide, debit_total: t.debit, credit_total: t.credit, balance };
  });
}

export function computeCashBookEntries(journalEntries, cashAccountCodes) {
  const rows = [];
  const sorted = [...journalEntries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  let running = 0;
  sorted.forEach(je => {
    je.lines.forEach(l => {
      if (!cashAccountCodes.includes(l.account_code)) return;
      const net = (l.debit || 0) - (l.credit || 0);
      if (net === 0) return;
      running += net;
      rows.push({
        id: `${je.id}-${l.account_code}`,
        date: je.date,
        description: je.narration,
        type: net > 0 ? 'INFLOW' : 'OUTFLOW',
        amount: Math.abs(net),
        category: je.ref_type,
        balance: running
      });
    });
  });
  return rows.reverse();
}

// A single account's ledger folio — the classic "T-account" transaction list with a
// running balance, used by the General Ledger page to show one account at a time
// instead of just its final balance.
export function computeLedgerFolio(account, journalEntries) {
  const rows = [];
  const sorted = [...journalEntries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const normalSide = ACCOUNT_TYPES[account.type] || 'DEBIT';
  let running = 0;
  sorted.forEach(je => {
    je.lines.forEach(l => {
      if (l.account_code !== account.code) return;
      if (!l.debit && !l.credit) return;
      const signed = normalSide === 'DEBIT' ? (l.debit - l.credit) : (l.credit - l.debit);
      running += signed;
      rows.push({
        id: `${je.id}-${l.account_code}`,
        date: je.date,
        narration: je.narration,
        ref_type: je.ref_type,
        ref_id: je.ref_id,
        branch: je.branch,
        voucher_type: je.voucher_type,
        debit: l.debit,
        credit: l.credit,
        balance: running
      });
    });
  });
  return rows;
}

export function computeTrialBalance(balances) {
  return balances.map(a => ({
    code: a.code,
    name: a.name,
    name_key: a.name_key,
    type: a.type,
    debit: a.normal_side === 'DEBIT' ? Math.max(a.balance, 0) : Math.max(-a.balance, 0),
    credit: a.normal_side === 'CREDIT' ? Math.max(a.balance, 0) : Math.max(-a.balance, 0)
  }));
}

export function computeProfitAndLoss(balances) {
  const revenueLines = balances.filter(a => a.type === 'REVENUE');
  const expenseLines = balances.filter(a => a.type === 'EXPENSE');
  const totalRevenue = revenueLines.reduce((s, a) => s + a.balance, 0);
  const totalExpense = expenseLines.reduce((s, a) => s + a.balance, 0);
  return {
    revenueLines,
    expenseLines,
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense
  };
}

// Shared date-filtering helpers so every Finance page's date filter behaves the
// same way, whether it needs a rolling period (Cash Book, General Ledger, Income
// Statement, Expense Vouchers) or a point-in-time snapshot (Trial Balance, Balance
// Sheet — both are "as of" a date, not "between two dates").
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export function resolveDateRange(preset) {
  const today = new Date();
  const start = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return toISODate(d);
  };
  switch (preset) {
    case 'TODAY':
      return { from: toISODate(today), to: toISODate(today) };
    case '7D':
      return { from: start(6), to: toISODate(today) };
    case '30D':
      return { from: start(29), to: toISODate(today) };
    case 'THIS_MONTH':
      return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISODate(today) };
    case 'LAST_MONTH': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISODate(first), to: toISODate(last) };
    }
    case 'THIS_YEAR':
      return { from: toISODate(new Date(today.getFullYear(), 0, 1)), to: toISODate(today) };
    case 'ALL':
    default:
      return { from: null, to: null };
  }
}

export function filterEntriesInRange(journalEntries, from, to) {
  if (!from && !to) return journalEntries;
  return journalEntries.filter(je => (!from || je.date >= from) && (!to || je.date <= to));
}

export function filterEntriesUpTo(journalEntries, asOfDate) {
  if (!asOfDate) return journalEntries;
  return journalEntries.filter(je => je.date <= asOfDate);
}

// 'ALL' is a deliberate, explicit choice to load every branch's figures — never the
// default, since on a real database that's the one query that can actually be heavy.
// No branch chosen yet (empty) returns nothing, so the page starts blank instead of
// silently defaulting to "all branches" and paying that cost every time it opens.
export function filterEntriesByBranch(journalEntries, branch) {
  if (branch === 'ALL') return journalEntries;
  if (!branch) return [];
  return journalEntries.filter(je => je.branch === branch);
}

// Maps "REF_TYPE:ref_id" -> the journal entry's created_at timestamp, so report
// pages can show the exact time a collection or disbursal was posted without
// storing a separate time field on the collection/loan record itself.
export function refTimeMap(journalEntries) {
  const map = {};
  journalEntries.forEach(je => {
    if (je.ref_type && je.ref_id != null) {
      map[`${je.ref_type}:${je.ref_id}`] = je.created_at;
    }
  });
  return map;
}

export function computeBalanceSheet(balances, netProfit) {
  const assetLines = balances.filter(a => a.type === 'ASSET');
  const liabilityLines = balances.filter(a => a.type === 'LIABILITY');
  const equityLines = balances.filter(a => a.type === 'EQUITY');
  const totalAssets = assetLines.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilityLines.reduce((s, a) => s + a.balance, 0);
  const totalEquityBase = equityLines.reduce((s, a) => s + a.balance, 0);
  return {
    assetLines,
    liabilityLines,
    equityLines,
    totalAssets,
    totalLiabilities,
    totalEquityBase,
    netProfit,
    totalEquityAndLiabilities: totalLiabilities + totalEquityBase + netProfit
  };
}
