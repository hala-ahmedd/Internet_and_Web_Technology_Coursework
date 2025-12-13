const { db } = require('../db.js');

const retrieveAllCases = (req, res) => {
  const query = `SELECT * FROM CASES WHERE STATUS='OPEN'`;

  db.all(query, (err, cases) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 'fail',
        message: 'Database error',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Cases retrieved successfully',
      results: cases.length,
      data: cases,
    });
  });
};

const getCaseById = (req, res) => {
  const caseId = req.params.id;
  if (!caseId || isNaN(caseId)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid case id' });
  }
  const query = `SELECT * FROM CASES WHERE CASE_ID = ?`;
  db.get(query, [caseId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!row) return res.status(404).json({ status: 'fail', message: 'Case not found' });
    return res.status(200).json({ status: 'success', data: row });
  });
};

const searchCases = (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return retrieveAllCases(req, res);
  }
  const like = `%${q}%`;
  const query = `SELECT * FROM CASES WHERE (TITLE LIKE ? OR DESCRIPTION LIKE ?) AND STATUS='OPEN'`;
  db.all(query, [like, like], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    res.status(200).json({ status: 'success', results: rows.length, data: rows });
  });
};

const createCase = (req, res) => {
  const { title, description, neededAmount } = req.body;

  if (!title || !description || !neededAmount) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide title, description, and needed amount.',
    });
  }
  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing title.' });
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing description.' });
  }
  if (!neededAmount || isNaN(neededAmount) || Number(neededAmount) <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Needed amount must be a positive number.' });
  }
  db.get(`SELECT DOCUMENT_STATUS FROM USER WHERE ID = ?`, [req.user.id], (err, userRow) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!userRow || userRow.DOCUMENT_STATUS !== 'APPROVED') {
      return res.status(403).json({ status: 'fail', message: 'Beneficiary documents not approved yet.' });
    }

    const query = `
      INSERT INTO CASES (TITLE, DESCRIPTION, NEEDED_AMOUNT, COLLECTED_AMOUNT, CREATED_BY)
      VALUES (?, ?, ?, 0, ?)
    `;
    const values = [title, description, neededAmount, req.user.id];

    db.run(query, values, function(err2) {
      if (err2) {
        console.error(err2);
        return res.status(500).json({
          status: 'fail',
          message: 'Database error',
        });
      }

      res.status(201).json({
        status: 'success',
        message: 'Case created successfully',
        case: {
          case_id: this.lastID,
          title,
          description,
          needed_amount: neededAmount,
          collected_amount: 0,
          created_by: req.user.id,
        },
      });
    });
  });
};

const updateCase = (req, res) => {
  const caseId = req.params.id;
  const { title, description, neededAmount, status } = req.body;

  if (!caseId || isNaN(caseId)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid case id' });
  }

  db.get(`SELECT * FROM CASES WHERE CASE_ID = ?`, [caseId], (err, caseRow) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!caseRow) return res.status(404).json({ status: 'fail', message: 'Case not found' });

    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(caseRow.CREATED_BY)) {
      return res.status(403).json({ status: 'fail', message: 'Not authorized to edit this case' });
    }

    const updates = [];
    const params = [];

    if (title) { updates.push('TITLE = ?'); params.push(title); }
    if (description) { updates.push('DESCRIPTION = ?'); params.push(description); }
    if (neededAmount && !isNaN(neededAmount) && Number(neededAmount) > 0) { updates.push('NEEDED_AMOUNT = ?'); params.push(neededAmount); }
    if (status) { updates.push('STATUS = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No valid fields to update' });
    }

    const sql = `UPDATE CASES SET ${updates.join(', ')} WHERE CASE_ID = ?`;
    params.push(caseId);

    db.run(sql, params, function(err2) {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ status: 'fail', message: 'Database error' });
      }
      return res.status(200).json({ status: 'success', message: 'Case updated' });
    });
  });
};

const deleteCase = (req, res) => {
  const caseId = req.params.id;
  if (!caseId || isNaN(caseId)) return res.status(400).json({ status: 'fail', message: 'Invalid case id' });

  db.get(`SELECT * FROM CASES WHERE CASE_ID = ?`, [caseId], (err, caseRow) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    if (!caseRow) return res.status(404).json({ status: 'fail', message: 'Case not found' });

    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(caseRow.CREATED_BY)) {
      return res.status(403).json({ status: 'fail', message: 'Not authorized to delete this case' });
    }

    const sql = `UPDATE CASES SET STATUS='CLOSED' WHERE CASE_ID = ?`;
    db.run(sql, [caseId], function(err2) {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ status: 'fail', message: 'Database error' });
      }
      return res.status(200).json({ status: 'success', message: 'Case closed' });
    });
  });
};

const donateToCase = (req, res) => {
  const { caseId, amount } = req.body;

  if (!caseId || !amount) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide caseId and donation amount.',
    });
  }
  if (!caseId || isNaN(caseId) || Number(caseId) <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing caseId.' });
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Donation amount must be a positive number.' });
  }

  const checkCaseQuery = `SELECT * FROM CASES WHERE CASE_ID = ?`;
  db.get(checkCaseQuery, [caseId], (err, caseRow) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 'fail',
        message: 'Database error',
      });
    }

    if (!caseRow) {
      return res.status(404).json({
        status: 'fail',
        message: 'Case not found',
      });
    }

    if (caseRow.STATUS && caseRow.STATUS.toUpperCase() === 'CLOSED') {
      return res.status(400).json({
        status: 'fail',
        message: 'This case is closed. Donations are no longer accepted.',
      });
    }

    const collectedAmount = Number(caseRow.COLLECTED_AMOUNT || 0);
    const neededAmount = Number(caseRow.NEEDED_AMOUNT || 0);
    
    if (collectedAmount >= neededAmount) {
      return res.status(400).json({
        status: 'fail',
        message: 'This case is already fully funded. Donations are no longer accepted.',
      });
    }

    if (Number(amount) + collectedAmount > neededAmount) {
      return res.status(400).json({
        status: 'fail',
        message: 'Donation exceeds the required amount. Please donate a smaller amount.',
      });
    }

    const insertDonationQuery = `
      INSERT INTO DONATIONS (CASE_ID, DONOR_ID, AMOUNT)
      VALUES (?, ?, ?)
    `;
    db.run(insertDonationQuery, [caseId, req.user.id, amount], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          status: 'fail',
          message: 'Database error',
        });
      }

      const donationId = this.lastID;

      const updateCaseQuery = `
        UPDATE CASES
        SET COLLECTED_AMOUNT = COLLECTED_AMOUNT + ?
        WHERE CASE_ID = ?
      `;
      db.run(updateCaseQuery, [amount, caseId], function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({
            status: 'fail',
            message: 'Database error',
          });
        }

        res.status(201).json({
          status: 'success',
          message: 'Donation successful',
          donation: {
            id: donationId,
            case_id: caseId,
            donor_id: req.user.id,
            amount,
          },
        });
      });
    });
  });
};

module.exports = {
  retrieveAllCases,
  getCaseById,
  searchCases,
  createCase,
  updateCase,
  deleteCase,
  donateToCase,
};
