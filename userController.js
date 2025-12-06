const bcrypt = require('bcryptjs');
const { db } = require('../db.js');
const { encrypt } = require('../encryption.js');
const { signToken } = require('../controllers/authController.js');

// Retrieve all users
const retrieveAllUsers = (req, res) => {
  const query = `SELECT * FROM USER`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error retrieving users' });
    }

    res.status(200).json({
      message: 'Users retrieved successfully',
      results: rows.length,
      data: rows,
    });
  });
};

// Create a new user (signup)
const createUser = (req, res) => {
  const { email, username, password, role = 'user', name, idNumber } = req.body;

  // Basic validation
  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  // Encrypt sensitive fields
  const encryptedEmail = encrypt(email);
  const encryptedName = name ? encrypt(name) : null;
  const encryptedID = idNumber ? encrypt(idNumber) : null;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error hashing password.');
    }

    const query = `
      INSERT INTO USER (USERNAME, ROLE, PASSWORD, EMAIL, NAME, IDNUMBER, EMAIL_IV, NAME_IV, IDNUMBER_IV)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      username,
      role,
      hashedPassword,
      encryptedEmail.data,
      encryptedName ? encryptedName.data : null,
      encryptedID ? encryptedID.data : null,
      encryptedEmail.iv,
      encryptedName ? encryptedName.iv : null,
      encryptedID ? encryptedID.iv : null,
    ];

    db.run(query, values, function(err) {
      if (err) {
        console.error(err);
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).send('Email already exists.');
        }
        return res.status(500).send('Database error.');
      }

      // Create JWT token and send it in a secure HttpOnly cookie
      const token = signToken(this.lastID, role);

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 3600000, // 1 hour
      });

      return res.status(201).json({
        status: 'success',
        message: 'Registration successful',
      });
    });
  });
};

module.exports = {
  createUser,
  retrieveAllUsers,
};
