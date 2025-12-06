const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db.js');
const { encrypt, decrypt } = require('../encryption.js'); 

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
// Simple password validation: at least 6 chars
const isValidPassword = (password) => password && password.length >= 6;
// Simple username validation: non-empty
const isValidUsername = (username) => username && username.trim() !== '';

//sign JWT
const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

//log authentication events 
const logAuthEvent = (email, status, req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const query = `INSERT INTO AUTH_LOGS (email, status, ip) VALUES (?, ?, ?)`;
  db.run(query, [email, status, ip], (err) => {
    if (err) console.error('Failed to log authentication event:', err);
  });
};

//POST /signup 
const signUp = (req, res) => {
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const role = req.body.role || 'user';
  const name = req.body.name;
  const idNumber = req.body.idNumber;
  if (!email || !password || !username) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Please provide username, email, and password.');
  }
  if (!isValidUsername(username)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Invalid or missing username.');
  }
  if (!isValidEmail(email)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Invalid or missing email.');
  }
  if (!isValidPassword(password)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Password must be at least 6 characters.');
  }
  // Optional: validate name and ID number if present
  if (name && name.trim() === '') {
    return res.status(400).send('Name cannot be empty.');
  }
  if (idNumber && idNumber.trim() === '') {
    return res.status(400).send('ID Number cannot be empty.');
  }

  // Encrypt sensitive fields
  const encryptedEmail = encrypt(email);
  const encryptedName = encrypt(name);
  const encryptedID = idNumber ? encrypt(idNumber) : null;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      logAuthEvent(email, 'FAILURE', req);
      return res.status(500).send('Error hashing password.');
    }

    const query = `
      INSERT INTO USER (USERNAME, ROLE, PASSWORD, EMAIL, NAME, IDNUMBER, EMAIL_IV, NAME_IV, IDNUMBER_IV)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        username,
        role,
        hashedPassword,
        encryptedEmail.data,
        encryptedName.data,
        encryptedID ? encryptedID.data : null,
        encryptedEmail.iv,
        encryptedName.iv,
        encryptedID ? encryptedID.iv : null
      ],
      function (err) {
        if (err) {
          logAuthEvent(email, 'FAILURE', req);
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).send('Email already exists.');
          }
          console.error(err);
          return res.status(500).send('Database error.');
        }

        const token = signToken(this.lastID, role);
        logAuthEvent(email, 'SUCCESS', req);

        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          maxAge: 3600000,
        });

        return res.status(201).json({
          status: 'success',
          message: 'Registration successful',
        });
      }
    );
  });
};

//POST /login
const login = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Please provide email and password.');
  }
  if (!isValidEmail(email)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Invalid or missing email.');
  }
  if (!isValidPassword(password)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).send('Password must be at least 6 characters.');
  }

  const query = `SELECT * FROM USER WHERE EMAIL=?`;

  db.get(query, [encrypt(email).data], (err, row) => {
    if (err) {
      console.log(err);
      logAuthEvent(email, 'FAILURE', req);
      return res.status(500).send('Database error');
    }

    if (!row) {
      logAuthEvent(email, 'FAILURE', req);
      return res.status(401).send('Invalid credentials');
    }

    bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
      if (err) {
        console.error(err);
        logAuthEvent(email, 'FAILURE', req);
        return res.status(500).send('Error verifying password.');
      }

      if (!isMatch) {
        logAuthEvent(email, 'FAILURE', req);
        return res.status(401).send('Invalid credentials');
      }

      const token = signToken(row.ID, row.ROLE);
      logAuthEvent(email, 'SUCCESS', req);

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 3600000,
      });

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: row.ID,
          role: row.ROLE,
        },
      });
    });
  });
};

//VERIFY TOKEN
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).send('Access denied: Token missing or malformed');
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send('Invalid or expired token');
    req.user = { id: decoded.id, role: decoded.role };
    next();
  });
};

//VERIFY ADMIN 
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied: Admins only');
    next();
  });
};

module.exports = { signUp, login, verifyToken, verifyAdmin };
