export class NpaService {
  static async evaluateNpaClassifications(db) {
    const [activeLoans] = await db.query(
      `SELECT id, loan_account_no, principal_amount, pending_amount, last_payment_date, loan_date, dpd_days, npa_status FROM loans WHERE status IN ('ACTIVE', 'OVERDUE')`
    );

    const today = new Date();
    const updates = [];

    for (const loan of activeLoans) {
      const baseDate = loan.last_payment_date ? new Date(loan.last_payment_date) : new Date(loan.loan_date);
      const diffTime = Math.abs(today - baseDate);
      const dpd = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let classification = 'STANDARD';
      if (dpd > 90 && dpd <= 180) {
        classification = 'SUB_STANDARD';
      } else if (dpd > 180 && dpd <= 365) {
        classification = 'DOUBTFUL';
      } else if (dpd > 365) {
        classification = 'LOSS';
      }

      if (dpd !== loan.dpd_days || classification !== loan.npa_status) {
        await db.query(
          `UPDATE loans SET dpd_days = ?, npa_status = ?, status = ? WHERE id = ?`,
          [dpd, classification, dpd > 0 ? 'OVERDUE' : 'ACTIVE', loan.id]
        );
        updates.push({ id: loan.id, loan_account_no: loan.loan_account_no, dpd_days: dpd, npa_status: classification });
      }
    }

    return updates;
  }

  static async getNpaSummary(db) {
    await NpaService.evaluateNpaClassifications(db);

    const [rows] = await db.query(
      `SELECT npa_status, COUNT(*) as loans_count, SUM(pending_amount) as total_exposure FROM loans WHERE status IN ('ACTIVE', 'OVERDUE') GROUP BY npa_status`
    );

    return rows;
  }
}
