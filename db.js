const sqlite = require('sqlite3');
const db = new sqlite.Database('charity.db');

//Case Table
const createCaseTable = `CREATE TABLE IF NOT EXISTS CASE (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  TITLE TEXT NOT NULL,
  DESCRIPTION TEXT NOT NULL,
  NEEDED_AMOUNT REAL NOT NULL,
  COLLECTED_AMOUNT REAL DEFAULT 0,
  CREATED_BY INTEGER NOT NULL, 
  CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

//User Table
const createUserTable = `CREATE TABLE IF NOT EXISTS USER (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  USERNAME TEXT UNIQUE NOT NULL,
  EMAIL TEXT UNIQUE NOT NULL,
  PASSWORD TEXT NOT NULL,
  ROLE TEXT NOT NULL,
  VERIFIED INTEGER DEFAULT 0,
  ACTIVE INTEGER DEFAULT 1
)`;

//Donations Table
const createDonationTable = `CREATE TABLE IF NOT EXISTS DONATIONS (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  CASE_ID INTEGER NOT NULL,
  DONOR_ID INTEGER NOT NULL,
  AMOUNT REAL NOT NULL,
  DONATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

//Authentication Logs Table
const createAuthLogsTable = `CREATE TABLE IF NOT EXISTS AUTH_LOGS (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  EMAIL TEXT,
  STATUS TEXT,
  IP TEXT,
  TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

//Initialize all tables 
db.serialize(() => {
  db.run(createCaseTable, (err) => {
    if (err) console.log('Error creating CASE table:', err.message);
  });
  db.run(createUserTable, (err) => {
    if (err) console.log('Error creating USER table:', err.message);
  });
  db.run(createDonationTable, (err) => {
    if (err) console.log('Error creating DONATIONS table:', err.message);
  });
  db.run(createAuthLogsTable, (err) => {
    if (err) console.log('Error creating AUTH_LOGS table:', err.message);
  });
});

module.exports = {
  db,
  createCaseTable,
  createUserTable,
  createDonationTable,
  createAuthLogsTable
};
