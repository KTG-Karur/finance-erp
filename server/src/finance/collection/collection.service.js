import { CollectionRepository } from './collection.repository.js';
import { calculatePaymentAllocation, calculateInterestOnlyAllocation } from '../../shared/interest-engine/interestEngine.js';
import { createCollectionVoucher, createCollectionReversalVoucher } from '../../shared/voucher-engine/voucherEngine.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';
import { saveBase64File } from '../../shared/utils/fileStorage.js';

const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024;

export class CollectionService {
  static async getCollections(db, filters) {
    return CollectionRepository.findAll(db, filters);
  }

  static async recordCollection(db, payload, createdBy, companyCode = 'default') {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const { loan_id, amount, payment_mode, notes, collector_name, payment_date, reference_no, branch, proof_image, latitude, longitude, bank_account_id, settlement_account_code } = payload;
      const totalAmount = parseFloat(amount) || 0;
      assertMaxFileSize(proof_image, MAX_PROOF_IMAGE_BYTES, 'Proof of payment photo');

      // Electronic Payment Reference Idempotency Guard (UPI / Bank Transfer / Cheque)
      const cleanRefNo = reference_no ? String(reference_no).trim() : null;
      if (cleanRefNo && (payment_mode || '').toUpperCase() !== 'CASH') {
        const [dupRows] = await conn.query(
          `SELECT id, receipt_no, collection_date FROM collections WHERE reference_no = ? AND reverted = 0 AND clearance_status != 'BOUNCED' LIMIT 1`,
          [cleanRefNo]
        );
        if (dupRows.length > 0) {
          const err = new Error(`Duplicate transaction reference: A collection with reference '${cleanRefNo}' was already recorded under receipt ${dupRows[0].receipt_no} on ${dupRows[0].collection_date}.`);
          err.statusCode = 409;
          throw err;
        }
      }

      // Resolve specific settlement bank account for non-cash modes
      let resolvedBankAccountId = bank_account_id ? parseInt(bank_account_id, 10) : null;
      let resolvedSettlementCode = settlement_account_code || null;
      let resolvedSettlementName = null;

      if (resolvedBankAccountId) {
        const [bankRows] = await conn.query(
          `SELECT id, bank_name, account_name, ledger_account_code FROM bank_accounts WHERE id = ?`,
          [resolvedBankAccountId]
        );
        if (bankRows.length > 0) {
          resolvedSettlementCode = bankRows[0].ledger_account_code || '1002';
          resolvedSettlementName = `${bankRows[0].bank_name} (${bankRows[0].account_name})`;
        }
      } else if (resolvedSettlementCode) {
        const [coaRows] = await conn.query(
          `SELECT account_name FROM chart_of_accounts WHERE account_code = ?`,
          [resolvedSettlementCode]
        );
        if (coaRows.length > 0) {
          resolvedSettlementName = coaRows[0].account_name;
        }
      }

      let diskProofImage = proof_image || null;
      if (proof_image && typeof proof_image === 'string' && proof_image.startsWith('data:')) {
        diskProofImage = await saveBase64File(proof_image, companyCode, 'collections', 'receipt_proof');
      }

      const [loanRows] = await conn.query(`SELECT * FROM loans WHERE id = ? FOR UPDATE`, [loan_id]);
      if (!loanRows.length) {
        throw new Error(`Loan account ID ${loan_id} not found.`);
      }
      const loan = loanRows[0];

      if (loan.status === 'CLOSED') {
        throw new Error('This loan is already fully closed.');
      }

      const [schedules] = await conn.query(
        `SELECT * FROM repayment_schedules WHERE loan_id = ? ORDER BY period ASC`,
        [loan_id]
      );

      const penalty = parseFloat(payload.penalty) || 0;
      const collectionDate = payment_date || new Date().toISOString().slice(0, 10);

      const minDate = loan.last_payment_date || loan.loan_date || null;
      if (minDate && collectionDate < minDate) {
        const err = new Error(`Collection date (${collectionDate}) cannot be earlier than ${loan.last_payment_date ? 'the last payment date' : 'the loan disbursal date'} (${minDate}).`);
        err.statusCode = 400;
        throw err;
      }
      const todayISO = new Date().toISOString().slice(0, 10);
      if (collectionDate > todayISO) {
        const err = new Error('Collection date cannot be in the future.');
        err.statusCode = 400;
        throw err;
      }

      // Check if client provided explicit manual breakdown (Principal, Interest, Additional Charges)
      const hasManualBreakdown = (payload.principal_paid !== undefined || payload.principal_portion !== undefined)
        && (payload.interest_paid !== undefined || payload.interest_portion !== undefined);

      let penaltyPaid = 0;
      let interestPaid = 0;
      let principalPaid = 0;

      if (hasManualBreakdown) {
        const rawP = payload.principal_paid !== undefined ? payload.principal_paid : payload.principal_portion;
        const rawI = payload.interest_paid !== undefined ? payload.interest_paid : payload.interest_portion;
        const rawPen = payload.penalty !== undefined ? payload.penalty : (payload.penalty_portion || payload.additional_charges || 0);

        principalPaid = Math.max(0, parseFloat(rawP) || 0);
        interestPaid = Math.max(0, parseFloat(rawI) || 0);
        penaltyPaid = Math.max(0, parseFloat(rawPen) || 0);

        const componentSum = Math.round((principalPaid + interestPaid + penaltyPaid) * 100) / 100;
        // Verify component sum matches totalAmount
        if (Math.abs(componentSum - totalAmount) > 0.05 && totalAmount <= 0) {
          totalAmount = componentSum;
        }

        const curPendingPrincipal = parseFloat(loan.pending_amount) || 0;
        if (principalPaid > curPendingPrincipal + 0.01) {
          const err = new Error(`Principal paid (₹${principalPaid.toFixed(2)}) cannot exceed outstanding principal balance (₹${curPendingPrincipal.toFixed(2)}).`);
          err.statusCode = 400;
          throw err;
        }
      } else {
        // Fallback to automatic strategy-based allocation
        const autoAlloc = (loan.repayment_method === 'INTEREST_ONLY' || !schedules.length)
          ? calculateInterestOnlyAllocation({ loan, amount: totalAmount, penalty, paymentDate: collectionDate })
          : calculatePaymentAllocation(schedules, totalAmount, penalty, loan.last_payment_date, collectionDate);

        penaltyPaid = autoAlloc.penaltyPaid;
        interestPaid = autoAlloc.interestPaid;
        principalPaid = autoAlloc.principalPaid;

        if (autoAlloc.excessAmount > 0.01) {
          const err = new Error(`Payment amount exceeds this loan's outstanding balance by ₹${autoAlloc.excessAmount.toFixed(2)}. Enter an amount up to what's actually due.`);
          err.statusCode = 400;
          throw err;
        }
      }

      const interestFromDate = payload.interest_from_date || loan.interest_paid_upto || loan.last_payment_date || loan.loan_date || collectionDate;
      const interestPaidUpto = payload.interest_paid_upto || payload.interest_upto_date || (interestPaid > 0 ? collectionDate : null);
      let interestDays = payload.interest_days !== undefined && payload.interest_days !== null ? parseInt(payload.interest_days, 10) : null;
      if ((interestDays === null || isNaN(interestDays)) && interestFromDate && interestPaidUpto) {
        const diffMs = new Date(interestPaidUpto).getTime() - new Date(interestFromDate).getTime();
        interestDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Interest Shortfall & Arrears Calculation
      const existingArrears = parseFloat(loan.pending_interest_arrears) || 0;
      const shortfallAction = payload.interest_shortfall_action || 'CARRY_FORWARD'; // 'CARRY_FORWARD' | 'WAIVE'
      const clientShortfall = Math.max(0, parseFloat(payload.interest_shortfall) || 0);
      const clientWaiver = Math.max(0, parseFloat(payload.interest_waiver) || 0);

      let interestShortfall = 0;
      let interestWaiver = 0;
      let updatedInterestArrears = existingArrears;

      if (payload.new_pending_interest_arrears !== undefined) {
        updatedInterestArrears = Math.max(0, parseFloat(payload.new_pending_interest_arrears) || 0);
        if (shortfallAction === 'WAIVE') {
          interestWaiver = clientWaiver > 0 ? clientWaiver : clientShortfall;
        } else {
          interestShortfall = clientShortfall;
        }
      } else {
        if (shortfallAction === 'CARRY_FORWARD') {
          interestShortfall = clientShortfall;
          updatedInterestArrears = Math.max(0, existingArrears + interestShortfall);
        } else if (shortfallAction === 'WAIVE') {
          interestWaiver = clientWaiver > 0 ? clientWaiver : clientShortfall;
        }
      }

      // Compute waiver approval tracking status
      let waiverStatus = 'NONE';
      let waiverApprovedBy = null;
      let waiverApprovedAt = null;
      if (interestWaiver > 0 || shortfallAction === 'WAIVE') {
        waiverStatus = payload.waiver_status || (payload.waiver_approved_by ? 'APPROVED' : 'PENDING_APPROVAL');
        waiverApprovedBy = payload.waiver_approved_by || (waiverStatus === 'APPROVED' ? (createdBy || 'Staff') : null);
        waiverApprovedAt = waiverStatus === 'APPROVED' ? new Date() : null;
      }

      const receiptNo = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      const [res] = await conn.query(
        `INSERT INTO collections (
          receipt_no, loan_id, borrower_name, phone, collector_name, amount, principal_paid, interest_paid, penalty, interest_shortfall, interest_waiver, waiver_status, waiver_approved_by, waiver_approved_at, payment_mode, bank_account_id, settlement_account_code, reference_no, branch, notes, proof_image, latitude, longitude, collection_date, interest_from_date, interest_paid_upto, interest_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNo,
          loan_id,
          loan.borrower_name,
          payload.phone || loan.phone || null,
          collector_name || loan.collector || 'Staff Collector',
          totalAmount,
          principalPaid,
          interestPaid,
          penaltyPaid,
          interestShortfall,
          interestWaiver,
          waiverStatus,
          waiverApprovedBy,
          waiverApprovedAt,
          payment_mode || 'CASH',
          resolvedBankAccountId,
          resolvedSettlementCode,
          cleanRefNo,
          branch || loan.branch || null,
          notes || null,
          diskProofImage || null,
          latitude ?? null,
          longitude ?? null,
          collectionDate,
          interestFromDate,
          interestPaidUpto,
          interestDays
        ]
      );

      const collectionId = res.insertId;

      // Update schedule rows if schedules exist
      if (schedules.length > 0) {
        const newInterestPaidByRow = new Map();
        const newPrincipalPaidByRow = new Map();
        let remainingInterest = interestPaid;
        for (const row of schedules) {
          const rowInterest = parseFloat(row.interest) || 0;
          const rowInterestPaid = parseFloat(row.interest_paid) || 0;
          const iDue = Math.max(0, rowInterest - rowInterestPaid);
          const iCover = Math.max(0, Math.min(remainingInterest, iDue));
          newInterestPaidByRow.set(row.id, Math.round((rowInterestPaid + iCover) * 100) / 100);
          remainingInterest -= iCover;
        }
        let remainingPrincipal = principalPaid;
        for (const row of schedules) {
          const rowPrincipal = parseFloat(row.principal) || 0;
          const rowPrincipalPaid = parseFloat(row.principal_paid) || 0;
          const pDue = Math.max(0, rowPrincipal - rowPrincipalPaid);
          const pCover = Math.max(0, Math.min(remainingPrincipal, pDue));
          newPrincipalPaidByRow.set(row.id, Math.round((rowPrincipalPaid + pCover) * 100) / 100);
          remainingPrincipal -= pCover;
        }
        for (const row of schedules) {
          const newIPaid = newInterestPaidByRow.get(row.id);
          const newPPaid = newPrincipalPaidByRow.get(row.id);
          const curIPaid = parseFloat(row.interest_paid) || 0;
          const curPPaid = parseFloat(row.principal_paid) || 0;
          const rowPrincipal = parseFloat(row.principal) || 0;
          const rowInterest = parseFloat(row.interest) || 0;
          if (newIPaid === curIPaid && newPPaid === curPPaid) continue;
          const isPaid = newPPaid >= (rowPrincipal - 0.01) && newIPaid >= (rowInterest - 0.01);
          const isPartial = (newPPaid > 0 || newIPaid > 0) && !isPaid;
          await conn.query(
            `UPDATE repayment_schedules SET principal_paid = ?, interest_paid = ?, status = ? WHERE id = ?`,
            [newPPaid, newIPaid, isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING', row.id]
          );
        }
      }

      const newCollected = parseFloat(loan.collected_amount) + totalAmount;
      // Pending balance reduction: reduced by principal paid
      const newPending = Math.max(0, parseFloat(loan.pending_amount) - principalPaid);
      const isFullyPaid = newPending === 0;

      // A fully-paid loan doesn't auto-close — it goes to PENDING_CLOSURE for an
      // admin to review before the account is actually marked CLOSED.
      let newStatus = loan.status;
      if (isFullyPaid && loan.status !== 'PENDING_CLOSURE' && loan.status !== 'CLOSED') {
        newStatus = 'PENDING_CLOSURE';
      } else if (!isFullyPaid && ['PENDING', 'APPROVED', 'OVERDUE'].includes(loan.status)) {
        newStatus = 'ACTIVE';
      }

      let nextDue = null;
      if (!isFullyPaid) {
        const cycleDays = loan.repayment_frequency === 'WEEKLY' ? 7 : loan.repayment_frequency === 'MONTHLY' ? 30 : 1;
        const d = new Date(collectionDate);
        d.setDate(d.getDate() + cycleDays);
        nextDue = d.toISOString().slice(0, 10);
      }

      // Auto Double-Entry Collection Voucher Posting via shared voucher engine
      const { voucherNo } = await createCollectionVoucher(conn, {
        collectionId,
        receiptNo,
        borrowerName: loan.borrower_name,
        amount: totalAmount,
        principalPaid,
        interestPaid,
        penaltyPaid,
        entryDate: collectionDate,
        branch: branch || loan.branch,
        createdBy,
        paymentMode: payment_mode,
        settlementAccountCode: resolvedSettlementCode,
        settlementAccountName: resolvedSettlementName
      });
      await conn.query(`UPDATE collections SET voucher_no = ?, new_principal_balance = ? WHERE id = ?`, [voucherNo, newPending, collectionId]);
      await conn.query(`UPDATE collections SET voucher_no = ?, new_principal_balance = ? WHERE id = ?`, [voucherNo, newPending, collectionId]);

      let closureSnapshotSql = '';
      const closureParams = [];
      if (newStatus === 'PENDING_CLOSURE') {
        const [historyRows] = await conn.query(
          `SELECT * FROM collections WHERE loan_id = ? ORDER BY collection_date DESC, id DESC`,
          [loan_id]
        );
        const snapshot = JSON.stringify({
          principal_amount: loan.principal_amount,
          total_collected: newCollected,
          total_payments: historyRows.length,
          payment_history: historyRows
        });
        closureSnapshotSql = `, closure_requested_at = ?, closure_requested_by = ?, closure_rejection_reason = NULL, closure_snapshot = ?`;
        closureParams.push(collectionDate, collector_name || loan.collector || 'Staff Collector', snapshot);
      }

      await conn.query(
        `UPDATE loans SET 
          collected_amount = ?, 
          pending_amount = ?, 
          pending_interest_arrears = ?,
          status = ?, 
          last_payment_date = ?, 
          interest_paid_upto = COALESCE(?, interest_paid_upto),
          next_due = ?${closureSnapshotSql} 
         WHERE id = ?`,
        [newCollected, newPending, updatedInterestArrears, newStatus, collectionDate, (interestPaid > 0 ? interestPaidUpto : null), nextDue, ...closureParams, loan_id]
      );

      await conn.commit();

      return {
        id: collectionId,
        loan_id,
        receipt_no: receiptNo,
        voucher_no: voucherNo,
        borrower_name: loan.borrower_name,
        loan_account_no: loan.loan_account_no,
        phone: payload.phone || loan.phone || null,
        collector_name: collector_name || loan.collector || 'Staff Collector',
        amount: totalAmount,
        principal_portion: principalPaid,
        principal_paid: principalPaid,
        interest_portion: interestPaid,
        interest_paid: interestPaid,
        penalty_portion: penaltyPaid,
        penalty: penaltyPaid,
        interest_from_date: interestFromDate,
        interest_paid_upto: interestPaidUpto,
        interest_days: interestDays,
        interest_shortfall: interestShortfall,
        interest_waiver: interestWaiver,
        waiver_status: waiverStatus,
        waiver_approved_by: waiverApprovedBy,
        waiver_approved_at: waiverApprovedAt,
        pending_interest_arrears: updatedInterestArrears,
        new_pending_balance: newPending,
        status: newStatus,
        payment_mode: payment_mode || 'CASH',
        reference_no: reference_no || null,
        branch: branch || loan.branch || null,
        collection_date: collectionDate,
        notes: notes || null,
        proof_image: proof_image || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        clearance_status: (payment_mode || 'CASH') === 'CHEQUE' ? 'PENDING_CLEARANCE' : 'CLEARED'
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Shared undo path for both a manual revert and a bounced cheque — walks
  // back the loan's pending/collected balances, the repayment_schedules rows
  // this collection paid into (LIFO — mirrors recordCollection's FIFO apply),
  // and posts a mirror-image reversal voucher. Caller decides what final flag
  // to set on the collections row (reverted vs bounced).
  static async #reverseCollectionEffects(conn, collection, loan, actor) {
    const principalPaid = parseFloat(collection.principal_paid) || 0;
    const interestPaid = parseFloat(collection.interest_paid) || 0;
    const penaltyPaid = parseFloat(collection.penalty) || 0;
    const totalAmt = parseFloat(collection.amount) || 0;

    // Must mirror recordCollection's pending_amount math exactly, branch for
    // branch: INTEREST_ONLY pending is pure outstanding principal (only
    // principalPaid ever touched it there), but EMI pending is tracked
    // against total_payable minus everything collected — i.e. the FULL
    // amount (principal+interest+penalty) reduced it, so only adding back
    // principalPaid here would understate pending by the interest portion
    // on every EMI reversal.
    const newPending = loan.repayment_method === 'INTEREST_ONLY'
      ? parseFloat(loan.pending_amount) + principalPaid
      : parseFloat(loan.pending_amount) + totalAmt;
    const newCollected = Math.max(0, parseFloat(loan.collected_amount) - totalAmt);
    const newStatus = (loan.status === 'PENDING_CLOSURE' || loan.status === 'CLOSED') ? 'ACTIVE' : loan.status;

    // Roll last_payment_date/next_due back too — otherwise a reverted loan
    // keeps whatever due-date extension this (now-undone) payment earned it,
    // which can mask a genuinely overdue loan from NPA/DPD evaluation until
    // its next real collection. Falls back to the loan's own loan_date if
    // this was the loan's only collection.
    const [[previousCollection]] = await conn.query(
      `SELECT collection_date FROM collections WHERE loan_id = ? AND id != ? AND reverted = 0 AND clearance_status != 'BOUNCED' ORDER BY collection_date DESC, id DESC LIMIT 1`,
      [loan.id, collection.id]
    );
    const lastPaymentDate = previousCollection?.collection_date || null;
    const dueBaseDate = previousCollection?.collection_date || loan.loan_date;
    let nextDue = null;
    if (newPending > 0 && dueBaseDate) {
      const cycleDays = loan.repayment_frequency === 'WEEKLY' ? 7 : loan.repayment_frequency === 'MONTHLY' ? 30 : 1;
      const d = new Date(dueBaseDate);
      d.setDate(d.getDate() + cycleDays);
      nextDue = d.toISOString().slice(0, 10);
    }

    await conn.query(
      `UPDATE loans SET pending_amount = ?, collected_amount = ?, status = ?, last_payment_date = ?, next_due = ? WHERE id = ?`,
      [newPending, newCollected, newStatus, lastPaymentDate, nextDue, loan.id]
    );

    const [schedules] = await conn.query(
      `SELECT * FROM repayment_schedules WHERE loan_id = ? AND (principal_paid > 0 OR interest_paid > 0) ORDER BY period DESC`,
      [loan.id]
    );
    let remainingP = principalPaid;
    let remainingI = interestPaid;
    for (const row of schedules) {
      if (remainingP <= 0 && remainingI <= 0) break;
      const pTake = Math.min(remainingP, parseFloat(row.principal_paid));
      const iTake = Math.min(remainingI, parseFloat(row.interest_paid));
      const newP = parseFloat(row.principal_paid) - pTake;
      const newI = parseFloat(row.interest_paid) - iTake;
      remainingP -= pTake;
      remainingI -= iTake;
      const status = (newP >= row.principal && newI >= row.interest) ? 'PAID' : (newP > 0 || newI > 0) ? 'PARTIAL' : 'PENDING';
      await conn.query(
        `UPDATE repayment_schedules SET principal_paid = ?, interest_paid = ?, status = ? WHERE id = ?`,
        [newP, newI, status, row.id]
      );
    }

    // Must reverse exactly what the original voucher posted, penalty included —
    // otherwise a reverted/bounced collection that had a penalty leaves that
    // penalty income sitting in the ledger permanently, with nothing left in
    // `collections` to explain why (and now that createCollectionVoucher books
    // penalty as its own line, omitting it here would also unbalance this
    // reversal voucher itself).
    if (principalPaid + interestPaid + penaltyPaid > 0) {
      await createCollectionReversalVoucher(conn, {
        collectionId: collection.id,
        receiptNo: collection.receipt_no,
        borrowerName: collection.borrower_name,
        amount: principalPaid + interestPaid + penaltyPaid,
        principalPaid,
        interestPaid,
        penaltyPaid,
        entryDate: new Date().toISOString().slice(0, 10),
        branch: collection.branch || loan.branch,
        createdBy: actor,
        paymentMode: collection.payment_mode,
        settlementAccountCode: collection.settlement_account_code
      });
    }
  }

  static async #loadCollectionAndLoan(conn, id) {
    const [rows] = await conn.query(`SELECT * FROM collections WHERE id = ? FOR UPDATE`, [id]);
    if (!rows.length) {
      const err = new Error('Collection record not found.');
      err.statusCode = 404;
      throw err;
    }
    const collection = rows[0];
    const [loanRows] = await conn.query(`SELECT * FROM loans WHERE id = ? FOR UPDATE`, [collection.loan_id]);
    if (!loanRows.length) {
      const err = new Error('The loan account linked to this collection was not found.');
      err.statusCode = 404;
      throw err;
    }
    return { collection, loan: loanRows[0] };
  }

  static async revertCollection(db, id, reason, revertedBy) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { collection, loan } = await CollectionService.#loadCollectionAndLoan(conn, id);
      if (collection.reverted) {
        const err = new Error('This collection has already been reverted.');
        err.statusCode = 409;
        throw err;
      }
      if (collection.clearance_status === 'BOUNCED') {
        const err = new Error('This collection was already reversed as a bounced cheque.');
        err.statusCode = 409;
        throw err;
      }
      await CollectionService.#reverseCollectionEffects(conn, collection, loan, revertedBy);
      await conn.query(
        `UPDATE collections SET reverted = 1, revert_reason = ?, reverted_by = ?, reverted_at = NOW() WHERE id = ?`,
        [reason || 'Not specified', revertedBy || 'Staff', id]
      );
      const [[updatedLoan]] = await conn.query(`SELECT * FROM loans WHERE id = ?`, [loan.id]);
      await conn.commit();
      return { loan: updatedLoan };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async markChequeBounced(db, id, reason, bouncedBy) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { collection, loan } = await CollectionService.#loadCollectionAndLoan(conn, id);
      if (collection.reverted) {
        const err = new Error('This collection has already been reverted.');
        err.statusCode = 409;
        throw err;
      }
      if (collection.clearance_status === 'BOUNCED') {
        const err = new Error('This cheque has already been marked bounced.');
        err.statusCode = 409;
        throw err;
      }
      await CollectionService.#reverseCollectionEffects(conn, collection, loan, bouncedBy);
      await conn.query(
        `UPDATE collections SET clearance_status = 'BOUNCED', bounce_reason = ?, bounced_by = ?, bounced_at = NOW() WHERE id = ?`,
        [reason || 'Not specified', bouncedBy || 'Staff', id]
      );
      const [[updatedLoan]] = await conn.query(`SELECT * FROM loans WHERE id = ?`, [loan.id]);
      await conn.commit();
      return { loan: updatedLoan };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async markChequeCleared(db, id) {
    const [res] = await db.query(
      `UPDATE collections SET clearance_status = 'CLEARED' WHERE id = ? AND reverted = 0`,
      [id]
    );
    if (!res.affectedRows) {
      const err = new Error('Collection record not found, or it has already been reverted.');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }

  // Metadata-only correction — payment mode, reference no, collector, date,
  // branch, notes. Deliberately does not touch amount/principal/interest:
  // that would require reversing and re-applying the allocation, which is
  // what revertCollection + a fresh collection is for.
  static async updateCollection(db, id, updates) {
    const [rows] = await db.query(`SELECT * FROM collections WHERE id = ?`, [id]);
    if (!rows.length) {
      const err = new Error('Collection record not found.');
      err.statusCode = 404;
      throw err;
    }
    const existing = rows[0];
    if (existing.reverted) {
      const err = new Error('A reverted collection cannot be edited.');
      err.statusCode = 409;
      throw err;
    }

    const wasCheque = existing.payment_mode === 'CHEQUE';
    const nextMode = updates.payment_mode || existing.payment_mode;
    const isCheque = nextMode === 'CHEQUE';
    let clearanceStatus = existing.clearance_status;
    if (!wasCheque && isCheque) clearanceStatus = 'PENDING_CLEARANCE';
    else if (wasCheque && !isCheque) clearanceStatus = 'CLEARED';

    await db.query(
      `UPDATE collections SET payment_mode = ?, reference_no = ?, collector_name = ?, collection_date = ?, branch = ?, notes = ?, clearance_status = ? WHERE id = ?`,
      [
        nextMode,
        updates.reference_no ?? existing.reference_no,
        updates.collector_name ?? existing.collector_name,
        updates.collection_date ?? existing.collection_date,
        updates.branch ?? existing.branch,
        updates.notes ?? existing.notes,
        clearanceStatus,
        id
      ]
    );
    return true;
  }

  // ── WAIVER APPROVAL QUEUE METHODS ─────────────────────────────────────────

  static async getWaivers(db, query = {}) {
    let sql = `
      SELECT 
        c.*, 
        l.loan_account_no, 
        l.borrower_name as loan_borrower_name, 
        l.phone as loan_phone, 
        l.principal_amount, 
        l.pending_amount as loan_pending_amount, 
        l.pending_interest_arrears as loan_pending_arrears, 
        l.interest_rate, 
        l.branch as loan_branch
      FROM collections c
      JOIN loans l ON c.loan_id = l.id
      WHERE (c.interest_waiver > 0 OR c.waiver_status != 'NONE')
    `;
    const params = [];
    if (query.status && query.status !== 'ALL') {
      sql += ` AND c.waiver_status = ?`;
      params.push(query.status);
    }
    if (query.branch && query.branch !== 'ALL') {
      sql += ` AND (c.branch = ? OR l.branch = ?)`;
      params.push(query.branch, query.branch);
    }
    sql += ` ORDER BY c.collection_date DESC, c.id DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async approveWaiver(db, collectionId, user) {
    const [rows] = await db.query(`SELECT * FROM collections WHERE id = ?`, [collectionId]);
    if (!rows.length) {
      const err = new Error('Collection record not found.');
      err.statusCode = 404;
      throw err;
    }
    const c = rows[0];
    if (c.reverted) {
      const err = new Error('Cannot approve a reverted collection waiver.');
      err.statusCode = 400;
      throw err;
    }
    const approverName = user?.name || user?.email || 'Authorized Manager';
    await db.query(
      `UPDATE collections SET waiver_status = 'APPROVED', waiver_approved_by = ?, waiver_approved_at = NOW(), waiver_rejection_reason = NULL WHERE id = ?`,
      [approverName, collectionId]
    );

    // If collection specified interest upto date, advance loan settlement
    if (c.interest_paid_upto) {
      await db.query(
        `UPDATE loans SET interest_paid_upto = COALESCE(?, interest_paid_upto) WHERE id = ?`,
        [c.interest_paid_upto, c.loan_id]
      );
    }

    const [updated] = await db.query(`SELECT * FROM collections WHERE id = ?`, [collectionId]);
    return updated[0];
  }

  static async rejectWaiver(db, collectionId, rejectionReason, user) {
    const [rows] = await db.query(`SELECT * FROM collections WHERE id = ?`, [collectionId]);
    if (!rows.length) {
      const err = new Error('Collection record not found.');
      err.statusCode = 404;
      throw err;
    }
    const c = rows[0];
    if (c.reverted) {
      const err = new Error('Cannot reject a reverted collection waiver.');
      err.statusCode = 400;
      throw err;
    }
    const approverName = user?.name || user?.email || 'Authorized Manager';
    const waiverAmount = parseFloat(c.interest_waiver) || 0;

    await db.query(
      `UPDATE collections SET waiver_status = 'REJECTED', waiver_rejection_reason = ?, waiver_approved_by = ?, waiver_approved_at = NOW() WHERE id = ?`,
      [rejectionReason || 'Waiver rejected by branch supervisor', approverName, collectionId]
    );

    // Convert rejected waiver amount back into pending loan interest arrears
    if (waiverAmount > 0) {
      await db.query(
        `UPDATE loans SET pending_interest_arrears = COALESCE(pending_interest_arrears, 0) + ? WHERE id = ?`,
        [waiverAmount, c.loan_id]
      );
    }

    const [updated] = await db.query(`SELECT * FROM collections WHERE id = ?`, [collectionId]);
    return updated[0];
  }
}
