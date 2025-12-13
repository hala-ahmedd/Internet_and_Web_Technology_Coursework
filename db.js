const sqlite = require('sqlite3');
const db = new sqlite.Database('charity.db');

const createUserTable = `
CREATE TABLE IF NOT EXISTS USER (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  USERNAME TEXT UNIQUE NOT NULL,
  ROLE TEXT NOT NULL,
  PASSWORD TEXT NOT NULL,
  EMAIL TEXT UNIQUE NOT NULL,
  NAME TEXT,
  IDNUMBER TEXT,
  IS_ACTIVE INTEGER DEFAULT 1,
  DOCUMENT_STATUS TEXT DEFAULT 'PENDING'
)
`;

const createCaseTable = `
CREATE TABLE IF NOT EXISTS CASES (
  CASE_ID INTEGER PRIMARY KEY AUTOINCREMENT,
  TITLE TEXT NOT NULL,
  DESCRIPTION TEXT NOT NULL,
  NEEDED_AMOUNT REAL NOT NULL,
  COLLECTED_AMOUNT REAL DEFAULT 0,
  CREATED_BY INTEGER NOT NULL,
  STATUS TEXT DEFAULT 'OPEN',
  CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createDonationTable = `
CREATE TABLE IF NOT EXISTS DONATIONS (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  CASE_ID INTEGER NOT NULL,
  DONOR_ID INTEGER NOT NULL,
  AMOUNT REAL NOT NULL,
  DONATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createInstallmentTable = `
CREATE TABLE IF NOT EXISTS INSTALLMENTS (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  CASE_ID INTEGER NOT NULL,
  DONOR_ID INTEGER NOT NULL,
  TOTAL_AMOUNT REAL NOT NULL,
  PAID_AMOUNT REAL DEFAULT 0,
  INTERVAL_DAYS INTEGER DEFAULT 30,
  NEXT_DUE_DATE TEXT,
  STATUS TEXT DEFAULT 'ACTIVE',
  CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createAuthLogsTable = `
CREATE TABLE IF NOT EXISTS AUTH_LOGS (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  EMAIL TEXT,
  STATUS TEXT, -- SUCCESS or FAILURE
  IP TEXT,
  TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const addColumnIfNotExists = (table, column, definition, cb) => {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) return cb && cb(err);
    const exists = rows && rows.some(r => r.name.toUpperCase() === column.toUpperCase());
    if (exists) return cb && cb(null, false);
    db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`, (err2) => {
      cb && cb(err2, true);
    });
  });
};

db.serialize(() => {
  db.run(createUserTable, (err) => {
    if (err) console.error('Error creating USER table:', err.message);
  });

  db.run(createCaseTable, (err) => {
    if (err) console.error('Error creating CASES table:', err.message);
  });

  db.run(createDonationTable, (err) => {
    if (err) console.error('Error creating DONATIONS table:', err.message);
  });

  db.run(createInstallmentTable, (err) => {
    if (err) console.error('Error creating INSTALLMENTS table:', err.message);
  });

  db.run(createAuthLogsTable, (err) => {
    if (err) console.error('Error creating AUTH_LOGS table:', err.message);
  });

  addColumnIfNotExists('USER', 'IS_ACTIVE', 'IS_ACTIVE INTEGER DEFAULT 1', (err) => {
    if (err) console.error('Failed to add IS_ACTIVE column:', err.message);
  });
  addColumnIfNotExists('USER', 'DOCUMENT_STATUS', "DOCUMENT_STATUS TEXT DEFAULT 'PENDING'", (err) => {
    if (err) console.error('Failed to add DOCUMENT_STATUS column:', err.message);
  });
  addColumnIfNotExists('CASES', 'STATUS', "STATUS TEXT DEFAULT 'OPEN'", (err) => {
    if (err) console.error('Failed to add STATUS column:', err.message);
  });
});

module.exports = {
  db,
  createUserTable,
  createCaseTable,
  createDonationTable,
  createAuthLogsTable,
  createInstallmentTable
};
