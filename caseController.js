const { db } = require('../db.js');

// Retrieve all cases
const retrieveAllCases = (req, res) => {
  const query = `SELECT * FROM CASE`;

  db.all(query, [], (err, cases) => {
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

// Create a new case (beneficiary only)
const createCase = (req, res) => {
  const { title, description, neededAmount } = req.body;

  if (!title || !description || !neededAmount) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide title, description, and needed amount.',
    });
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing title.' });
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing description.' });
  }
  if (!neededAmount || isNaN(neededAmount) || Number(neededAmount) <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Needed amount must be a positive number.' });
  }
  const query = `
    INSERT INTO CASE (title, description, needed_amount, collected_amount, created_by)
    VALUES (?, ?, ?, 0, ?)
  `;
  const values = [title, description, neededAmount, req.user.id];

  db.run(query, values, function(err) {
    if (err) {
      console.error(err);
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
};

// Donate to a case (donor only)
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

  // Check if the case exists
  const checkCaseQuery = `SELECT * FROM CASE WHERE case_id = ?`;
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

    // Insert donation
    const insertDonationQuery = `
      INSERT INTO DONATIONS (case_id, donor_id, amount)
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

      // Update the collected amount in CASE table
      const updateCaseQuery = `
        UPDATE CASE
        SET collected_amount = collected_amount + ?
        WHERE case_id = ?
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
            id: this.lastID,
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
  createCase,
  donateToCase,
};
