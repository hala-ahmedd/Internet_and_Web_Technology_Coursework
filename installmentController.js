const { db } = require('../db.js');

const createInstallment = (req, res) => {
  const { caseId, totalAmount, intervalDays = 30, firstDueDate } = req.body;

  if (!caseId || !totalAmount) {
    return res.status(400).json({ status: 'fail', message: 'caseId and totalAmount are required' });
  }
  if (isNaN(caseId) || isNaN(totalAmount) || Number(totalAmount) <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid numeric values' });
  }

  db.get(`SELECT * FROM CASES WHERE CASE_ID = ?`, [caseId], (err, caseRow) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!caseRow) return res.status(404).json({ status: 'fail', message: 'Case not found' });
    const status = caseRow.STATUS;
    if (status && status.toUpperCase() === 'CLOSED') return res.status(400).json({ status: 'fail', message: 'Case closed' });

    const insertSql = `
      INSERT INTO INSTALLMENTS (CASE_ID, DONOR_ID, TOTAL_AMOUNT, PAID_AMOUNT, INTERVAL_DAYS, NEXT_DUE_DATE)
      VALUES (?, ?, ?, 0, ?, ?)
    `;
    db.run(insertSql, [caseId, req.user.id, totalAmount, intervalDays, firstDueDate || null], function(err2) {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ status: 'fail', message: 'Database error' });
      }
      return res.status(201).json({
        status: 'success',
        message: 'Installment plan created',
        installmentId: this.lastID
      });
    });
  });
};

const payInstallment = (req, res) => {
  const { installmentId, amount } = req.body;
  if (!installmentId || !amount) return res.status(400).json({ status: 'fail', message: 'installmentId and amount required' });
  if (isNaN(installmentId) || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ status: 'fail', message: 'Invalid values' });

  db.get(`SELECT * FROM INSTALLMENTS WHERE ID = ?`, [installmentId], (err, inst) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!inst) return res.status(404).json({ status: 'fail', message: 'Installment not found' });
    if (Number(inst.DONOR_ID) !== Number(req.user.id)) return res.status(403).json({ status: 'fail', message: 'Not owner of this installment' });
    if (inst.STATUS !== 'ACTIVE') return res.status(400).json({ status: 'fail', message: 'Installment not active' });

    if (Number(inst.PAID_AMOUNT) + Number(amount) > Number(inst.TOTAL_AMOUNT)) {
      return res.status(400).json({ status: 'fail', message: 'Payment exceeds installment remaining amount' });
    }

    db.get(`SELECT * FROM CASES WHERE CASE_ID = ?`, [inst.CASE_ID], (err2, caseRow) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ status: 'fail', message: 'Database error' });
      }
      if (!caseRow) return res.status(404).json({ status: 'fail', message: 'Case not found' });
      const caseStatus = caseRow.STATUS;
      if (caseStatus && caseStatus.toUpperCase() === 'CLOSED') {
        return res.status(400).json({ status: 'fail', message: 'Case is closed' });
      }

      const collected = Number(caseRow.COLLECTED_AMOUNT || 0);
      const needed = Number(caseRow.NEEDED_AMOUNT || 0);
      if (collected + Number(amount) > needed) {
        return res.status(400).json({ status: 'fail', message: 'Payment would overfund the case' });
      }

      const insertDonation = `INSERT INTO DONATIONS (CASE_ID, DONOR_ID, AMOUNT) VALUES (?, ?, ?)`;
      db.run(insertDonation, [inst.CASE_ID, req.user.id, amount], function(err3) {
        if (err3) {
          console.error(err3);
          return res.status(500).json({ status: 'fail', message: 'Database error' });
        }

        const newPaid = Number(inst.PAID_AMOUNT) + Number(amount);
        const nextStatus = (newPaid >= Number(inst.TOTAL_AMOUNT)) ? 'COMPLETED' : 'ACTIVE';
        const updateInst = `UPDATE INSTALLMENTS SET PAID_AMOUNT = ?, STATUS = ?, NEXT_DUE_DATE = ? WHERE ID = ?`;
        let nextDue = inst.NEXT_DUE_DATE;
        if (nextDue && inst.INTERVAL_DAYS) {
          try {
            const d = new Date(nextDue);
            d.setDate(d.getDate() + Number(inst.INTERVAL_DAYS));
            nextDue = d.toISOString();
          } catch (e) {
            nextDue = inst.NEXT_DUE_DATE;
          }
        }
        db.run(updateInst, [newPaid, nextStatus, nextDue, installmentId], function(err4) {
          if (err4) {
            console.error(err4);
            return res.status(500).json({ status: 'fail', message: 'Database error' });
          }

          const updateCaseSql = `UPDATE CASES SET COLLECTED_AMOUNT = COLLECTED_AMOUNT + ? WHERE CASE_ID = ?`;
          db.run(updateCaseSql, [amount, inst.CASE_ID], function(err5) {
            if (err5) {
              console.error(err5);
              return res.status(500).json({ status: 'fail', message: 'Database error' });
            }
            return res.status(201).json({ status: 'success', message: 'Payment recorded' });
          });
        });
      });
    });
  });
};

const viewMyInstallments = (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT * FROM INSTALLMENTS WHERE DONOR_ID = ? ORDER BY CREATED_AT DESC`;
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    return res.status(200).json({ status: 'success', results: rows.length, data: rows });
  });
};

module.exports = {
  createInstallment,
  payInstallment,
  viewMyInstallments,
};
