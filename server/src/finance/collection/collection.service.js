import { CollectionRepository } from './collection.repository.js';
import { calculatePaymentAllocation } from '../../shared/interest-engine/interestEngine.js';
import { createCollectionVoucher } from '../../shared/voucher-engine/voucherEngine.js';

export class CollectionService {
  static async getCollections(db, filters) {
    return CollectionRepository.findAll(db, filters);
  }

  static async recordCollection(db, payload) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const { loan_id, amount, payment_mode, notes, collector_name, payment_date } = payload;
      const totalAmount = parseFloat(amount) || 0;

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
      const { penaltyPaid, interestPaid, principalPaid } = calculatePaymentAllocation(schedules, totalAmount, penalty);

      const receiptNo = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const collectionDate = payment_date || new Date().toISOString().slice(0, 10);

      const [res] = await conn.query(
        `INSERT INTO collections (
          receipt_no, loan_id, borrower_name, collector_name, amount, principal_paid, interest_paid, penalty, payment_mode, collection_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNo,
          loan_id,
          loan.borrower_name,
          collector_name || loan.collector || 'Staff Collector',
          totalAmount,
          principalPaid,
          interestPaid,
          penaltyPaid,
          payment_mode || 'CASH',
          collectionDate
        ]
      );

      const collectionId = res.insertId;

      let remainingToApply = totalAmount - penaltyPaid;
      for (const row of schedules) {
        if (remainingToApply <= 0) break;

        const iDue = row.interest - row.interest_paid;
        const iCover = Math.min(remainingToApply, iDue);
        const newIPaid = row.interest_paid + iCover;
        remainingToApply -= iCover;

        const pDue = row.principal - row.principal_paid;
        const pCover = Math.min(remainingToApply, pDue);
        const newPPaid = row.principal_paid + pCover;
        remainingToApply -= pCover;

        const isPaid = newPPaid >= row.principal && newIPaid >= row.interest;
        const isPartial = (newPPaid > 0 || newIPaid > 0) && !isPaid;

        await conn.query(
          `UPDATE repayment_schedules SET principal_paid = ?, interest_paid = ?, status = ? WHERE id = ?`,
          [newPPaid, newIPaid, isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING', row.id]
        );
      }

      const newCollected = parseFloat(loan.collected_amount) + totalAmount;
      const newPending = Math.max(0, parseFloat(loan.total_payable) - newCollected);
      const isClosed = newPending === 0;

      await conn.query(
        `UPDATE loans SET collected_amount = ?, pending_amount = ?, status = ?, last_payment_date = ? WHERE id = ?`,
        [newCollected, newPending, isClosed ? 'CLOSED' : loan.status, collectionDate, loan_id]
      );

      // Auto Double-Entry Collection Voucher Posting via shared voucher engine
      await createCollectionVoucher(conn, {
        collectionId,
        receiptNo,
        borrowerName: loan.borrower_name,
        amount: totalAmount,
        principalPaid,
        interestPaid,
        entryDate: collectionDate
      });

      await conn.commit();

      return {
        id: collectionId,
        receipt_no: receiptNo,
        amount: totalAmount,
        principal_portion: principalPaid,
        interest_portion: interestPaid,
        penalty_portion: penaltyPaid,
        new_pending_balance: newPending,
        status: isClosed ? 'CLOSED' : loan.status
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
