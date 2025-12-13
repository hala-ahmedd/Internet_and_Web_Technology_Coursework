const { app } = require('./index.js');
const db_access = require('./db.js');
const db = db_access.db;

const PORT = 3000;

db.serialize(() => {
  db.run(db_access.createCaseTable, (err) => {
    if (err) console.log('Error creating case table:', err.message);
  });
  db.run(db_access.createUserTable, (err) => {
    if (err) console.log('Error creating user table:', err.message);
  });
  db.run(db_access.createDonationTable, (err) => {
    if (err) console.log('Error creating donation table:', err.message);
  });
  db.run(db_access.createInstallmentTable, (err) => {
    if (err) console.log('Error creating installment table:', err.message);
  });
  db.run(db_access.createAuthLogsTable, (err) => {
    if (err) console.log('Error creating auth_logs table:', err.message);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});