const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db.js');
const { isValidEmail, isValidPassword, isValidUsername } = require('../validator.js');

const signToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id, role }, secret, { expiresIn });
};

const logAuthEvent = (email, status, req) => {
  let ip = req.ip || (req.connection && req.connection.remoteAddress) || '';
  if (ip === '::1') ip = '127.0.0.1';
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.split('::ffff:')[1];

  const query = `INSERT INTO AUTH_LOGS (EMAIL, STATUS, IP) VALUES (?, ?, ?)`;
  db.run(query, [email, status, ip], (err) => {
    if (err) console.error('Failed to log authentication event:', err);
  });
};

const extractToken = (req) => {
  const authHeader = req.headers && req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  const rawCookie = req.headers && req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    if (match) return match.split('=')[1];
  }

  return null;
}; 
const signUp = (req, res) => {
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
      return res.status(500).json({ status: 'error', message: 'Error hashing password.' });
    }

    const query = `
      INSERT INTO USER (USERNAME, ROLE, PASSWORD, EMAIL, NAME, IDNUMBER)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        username,
        role,
        hashedPassword,
        email,
        name,
        idNumber
      ],
      function (err) {
        if (err) {
          logAuthEvent(email, 'FAILURE', req);
          if (err.message && err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ status: 'fail', message: 'Email already exists.' });
          }
          console.error(err);
          return res.status(500).json({ status: 'error', message: 'Database error.' });
        }

        const token = signToken(this.lastID, role);
        logAuthEvent(email, 'SUCCESS', req);

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 3600000,
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
      }
    );
  });
};

const login = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Please provide email and password.' });
  }
  if (!isValidEmail(email)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Invalid or missing email.' });
  }
  if (!isValidPassword(password)) {
    logAuthEvent(email || 'N/A', 'FAILURE', req);
    return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters.' });
  }

  const query = `SELECT * FROM USER WHERE EMAIL=?`;

  db.get(query, [email], (err, row) => {
    if (err) {
      console.error(err);
      logAuthEvent(email, 'FAILURE', req);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (!row) {
      logAuthEvent(email, 'FAILURE', req);
      return res.status(401).json({ status: 'fail', message: 'Account not found' });
    }

    if (Number(row.IS_ACTIVE) === 0) {
      logAuthEvent(email, 'FAILURE', req);
      return res.status(403).json({ status: 'fail', message: 'Account is deactivated' });
    }

    bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
      if (err) {
        console.error(err);
        logAuthEvent(email, 'FAILURE', req);
        return res.status(500).json({ status: 'error', message: 'Error verifying password.' });
      }

      if (!isMatch) {
        logAuthEvent(email, 'FAILURE', req);
        return res.status(401).json({ status: 'fail', message: 'Invalid credentials' });
      }

      const token = signToken(row.ID, row.ROLE);
      logAuthEvent(email, 'SUCCESS', req);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 3600000,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        user: {
          id: row.ID,
          role: row.ROLE,
        },
        token,
      });
    });
  });
};

const verifyToken = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(403).json({ status: 'fail', message: 'Access denied: Token missing or malformed' });
  }

  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.status(403).json({ status: 'fail', message: 'Invalid or expired token' });
    req.user = { id: decoded.id, role: decoded.role };
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ status: 'fail', message: 'Access denied: Admins only' });
    next();
  });
};
const verifyBeneficiary = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'beneficiary') {
      return res.status(403).json({ status: 'fail', message: 'Access denied: Beneficiaries only' });
    }
    next();
  });
};
const verifyDonor = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ status: 'fail', message: 'Access denied: Donors only' });
    }
    next();
  });
};

module.exports = {
  signUp,
  login,
  verifyToken,
  verifyAdmin,
  verifyBeneficiary,
  verifyDonor,
  logAuthEvent,
  signToken,
};
