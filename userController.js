const { db } = require('../db.js');

// Retrieve all users
const retrieveAllUsers = (req, res) => {
  const query = `SELECT * FROM USER`;

  db.all(query, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Error retrieving users' });
    }
    return res.status(200).json({
      message: 'Users retrieved successfully',
      data: rows
    });
  });
};

// Create a new user
const createUser = (req, res) => {
  const { email, role, password } = req.body;

  // Basic validation
  if (!email || !role || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error hashing password.');
      }
  
      // Insert
      const query = `
        INSERT INTO USER (EMAIL, ROLE, PASSWORD)
        VALUES ('${email}', '${role}', '${hashedPassword}')
      `;
  
      db.run(query, (err) => {
        if (err) {
          // Handle unique constraint violation
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).send('Email already exists.');
          }
          console.error(err);
          return res.status(500).send('Database error.');
        }
  
        // Create token
        const token = signToken(this.lastID, role);
        return res.status(201).json({
          status: 'success',
          message: 'Registration successful',
          token,
        });
      });
    });
};


module.exports = {
  createUser,
  retrieveAllUsers,
};
