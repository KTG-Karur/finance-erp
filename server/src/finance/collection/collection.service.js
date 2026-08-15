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

      const { loan_id, amount, payment_mode, notes, collector_name, payment_date, reference_no, branch, proof_image, latitude, longitude } = payload;
      const totalAmount = parseFloat(amount) || 0;
      assertMaxFileSize(proof_image, MAX_PROOF_IMAGE_BYTES, 'Proof of payment photo');

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

      // Interest-Only loans carry no repayment_schedules rows at all (no fixed
      // installment plan) — the schedule-based allocator would silently return
      // zero interest/principal for them, so they get the live day-accrual
      // allocator instead. EMI loans (or any loan that does have schedule rows)
      // keep the existing schedule-based split.
      const { penaltyPaid, interestPaid, principalPaid, excessAmount } = (loan.repayment_method === 'INTEREST_ONLY' || !schedules.length)
        ? calculateInterestOnlyAllocation({ loan, amount: totalAmount, penalty, paymentDate: collectionDate })
        : calculatePaymentAllocation(schedules, totalAmount, penalty);

      // calculatePaymentAllocation returns whatever's left over once penalty +
      // every rupee of interest and principal actually due has been covered —
      // previously this was silently dropped: the cash was recorded as fully
      // collected but the excess was never applied anywhere (not principal, not
      // interest, no refund/credit), and the ledger voucher below would have
      // been short by exactly this amount, failing validateDoubleEntry outright.
      // Rejecting up front means the collector re-enters the correct amount
      // instead of the payment being silently mis-recorded or crashing.
      if (excessAmount > 0.01) {
        const err = new Error(`Payment amount exceeds this loan's outstanding balance by ₹${excessAmount.toFixed(2)}. Enter an amount up to what's actually due.`);
        err.statusCode = 400;
        throw err;
      }

      const receiptNo = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      const [res] = await conn.query(
        `INSERT INTO collections (
          receipt_no, loan_id, borrower_name, phone, collector_name, amount, principal_paid, interest_paid, penalty, payment_mode, reference_no, branch, notes, proof_image, latitude, longitude, collection_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          payment_mode || 'CASH',
          reference_no || null,
          branch || loan.branch || null,
          notes || null,
          diskProofImage || null,
          latitude ?? null,
          longitude ?? null,
          collectionDate
        ]
      );

      const collectionId = res.insertId;

      // Must apply in exactly the same order calculatePaymentAllocation used to
      // produce interestPaid/principalPaid above — all interest due across every
      // row first (in schedule order), then all principal due across every row
      // — not interest-then-principal per row before moving on. The two orders
      // produce different per-row (and therefore different total) splits
      // whenever a payment doesn't fully cover every row it touches, which used
      // to leave the schedule rows disagreeing with the interestPaid/principalPaid
      // totals actually recorded on the collection and posted to the ledger.
      const newInterestPaidByRow = new Map();
      const newPrincipalPaidByRow = new Map();
      let remainingInterest = interestPaid;
      for (const row of schedules) {
        const iDue = row.interest - row.interest_paid;
        const iCover = Math.max(0, Math.min(remainingInterest, iDue));
        newInterestPaidByRow.set(row.id, row.interest_paid + iCover);
        remainingInterest -= iCover;
      }
      let remainingPrincipal = principalPaid;
      for (const row of schedules) {
        const pDue = row.principal - row.principal_paid;
        const pCover = Math.max(0, Math.min(remainingPrincipal, pDue));
        newPrincipalPaidByRow.set(row.id, row.principal_paid + pCover);
        remainingPrincipal -= pCover;
      }
      for (const row of schedules) {
        const newIPaid = newInterestPaidByRow.get(row.id);
        const newPPaid = newPrincipalPaidByRow.get(row.id);
        if (newIPaid === row.interest_paid && newPPaid === row.principal_paid) continue;
        const isPaid = newPPaid >= row.principal && newIPaid >= row.interest;
        const isPartial = (newPPaid > 0 || newIPaid > 0) && !isPaid;
        await conn.query(
          `UPDATE repayment_schedules SET principal_paid = ?, interest_paid = ?, status = ? WHERE id = ?`,
          [newPPaid, newIPaid, isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING', row.id]
        );
      }

      const newCollected = parseFloat(loan.collected_amount) + totalAmount;
      // Interest-Only loans never "use up" total_payable (interest keeps
      // accruing indefinitely) — their pending balance is purely the
      // outstanding principal, reduced only by the principal portion of each
      // payment. EMI loans track pending against the fixed total_payable set
      // at disbursal.
      const newPending = loan.repayment_method === 'INTEREST_ONLY'
        ? Math.max(0, parseFloat(loan.pending_amount) - principalPaid)
        : Math.max(0, parseFloat(loan.total_payable) - newCollected);
      const isFullyPaid = newPending === 0;

      // A fully-paid loan doesn't auto-close — it goes to PENDING_CLOSURE for an
      // admin to review (with the full payment history attached) before the
      // account is actually marked CLOSED. Prevents a mis-entered collection
      // from silently closing an account with no review step.
      let newStatus = loan.status;
      if (isFullyPaid && loan.status !== 'PENDING_CLOSURE' && loan.status !== 'CLOSED') {
        newStatus = 'PENDING_CLOSURE';
      } else if (!isFullyPaid && ['PENDING', 'APPROVED', 'OVERDUE'].includes(loan.status)) {
        // A payment against a loan that was somehow still PENDING/APPROVED (not
        // yet marked disbursed) or OVERDUE both mean it's actively being repaid.
        newStatus = 'ACTIVE';
      }

      // Advance the next expected payment date by one collection cycle so NPA/DPD
      // evaluation has a real due date to compare against instead of guessing off
      // last_payment_date alone (which would flag a same-day-paid loan as overdue
      // the very next calendar day, even for loans on track).
      let nextDue = null;
      if (!isFullyPaid) {
        const cycleDays = loan.repayment_frequency === 'WEEKLY' ? 7 : loan.repayment_frequency === 'MONTHLY' ? 30 : 1;
        const d = new Date(collectionDate);
        d.setDate(d.getDate() + cycleDays);
        nextDue = d.toISOString().slice(0, 10);
      }

      // Auto Double-Entry Collection Voucher Posting via shared voucher engine —
      // run before the closure snapshot below so that, when this is the payment
      // that fully settles the loan, the snapshot's payment history already
      // carries the real voucher_no instead of leaving that row's voucher blank.
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
        createdBy
      });
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
        `UPDATE loans SET collected_amount = ?, pending_amount = ?, status = ?, last_payment_date = ?, next_due = ?${closureSnapshotSql} WHERE id = ?`,
        [newCollected, newPending, newStatus, collectionDate, nextDue, ...closureParams, loan_id]
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
        interest_portion: interestPaid,
        penalty_portion: penaltyPaid,
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
        createdBy: actor
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
}
