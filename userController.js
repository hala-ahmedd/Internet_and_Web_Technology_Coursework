const bcrypt = require('bcryptjs');
const { db } = require('../db.js');
const { signToken, logAuthEvent } = require('../controllers/authController.js');
const { isValidEmail, isValidPassword, isValidUsername } = require('../validator.js');

const retrieveAllUsers = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'fail',
      message: 'Only admins can view all users.'
    });
  }

  const query = `SELECT * FROM USER`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 'fail',
        message: 'Error retrieving users'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      results: rows.length,
      data: rows
    });
  });
};

const createUser = (req, res) => {
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const allowedRoles = ['admin', 'donor', 'beneficiary'];
  const role = allowedRoles.includes(req.body.role) ? req.body.role : 'donor';
  const name = req.body.name;
  const idNumber = req.body.idNumber;

  if (!email || !password || !username) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Please provide username, email, and password.' });
  }
  if (!isValidUsername(username)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing username.' });
  }
  if (!isValidEmail(email)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing email.' });
  }
  if (!isValidPassword(password)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters.' });
  }
  if (name && name.trim() === '') {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Name cannot be empty.' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      logAuthEvent(email, 'FAILURE', req);
      return res.status(500).json({
        status: 'fail',
        message: 'Error hashing password.'
      });
    }

    const query = `
      INSERT INTO USER (USERNAME, ROLE, PASSWORD, EMAIL, NAME, IDNUMBER)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      username,
      role,
      hashedPassword,
      email,
      name || null,
      idNumber || null
    ];

    db.run(query, values, function(err) {
      if (err) {
        logAuthEvent(email, 'FAILURE', req);
        if (err.message && err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ status: 'fail', message: 'Email already exists.' });
        }
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error.' });
      }

      logAuthEvent(email, 'SUCCESS', req);

      const token = signToken(this.lastID, role);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 3600000
      });

      return res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        token,
        user: {
          id: this.lastID,
          username,
          email,
          role
        }
      });
    });
  });
};

const deactivateAccount = (req, res) => {
  const userId = req.params.id;
  if (!userId || isNaN(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid user id' });

  if (req.user.role !== 'admin' && Number(req.user.id) !== Number(userId)) {
    return res.status(403).json({ status: 'fail', message: 'Not authorized' });
  }

  const sql = `UPDATE USER SET IS_ACTIVE = 0 WHERE ID = ?`;
  db.run(sql, [userId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    return res.status(200).json({ status: 'success', message: 'Account deactivated' });
  });
};

const verifyBeneficiaryDocs = (req, res) => {
  const userId = req.params.id;
  const { decision } = req.body;

  if (!userId || isNaN(userId) || !decision || !['APPROVED','REJECTED'].includes(decision)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid input' });
  }

  const sql = `UPDATE USER SET DOCUMENT_STATUS = ? WHERE ID = ? AND ROLE = 'beneficiary'`;
  db.run(sql, [decision, userId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    return res.status(200).json({ status: 'success', message: `Document ${decision}` });
  });
};

const getProfile = (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT ID, USERNAME, ROLE, EMAIL, NAME, IDNUMBER, IS_ACTIVE, DOCUMENT_STATUS FROM USER WHERE ID = ?`;
  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    return res.status(200).json({ status: 'success', data: row });
  });
};

const viewUserDonations = (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT * FROM DONATIONS WHERE DONOR_ID = ? ORDER BY DONATED_AT DESC`;
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'fail', message: 'Database error' });
    }
    const total = rows.reduce((acc, r) => acc + Number(r.AMOUNT || 0), 0);
    return res.status(200).json({ status: 'success', total_donated: total, results: rows.length, data: rows });
  });
};

module.exports = {
  createUser,
  retrieveAllUsers,
  deactivateAccount,
  verifyBeneficiaryDocs,
  getProfile,
  viewUserDonations,
};
