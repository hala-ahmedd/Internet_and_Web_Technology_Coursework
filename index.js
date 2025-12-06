const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const caseRouter = require('./routes/caseRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const authRouter = require('./routes/authRoutes.js');

// Load environment variables from .env file
dotenv.config();

// Create an instance of the Express application
const app = express();

// Use middleware to parse JSON data from request bodies
app.use(express.json());


app.use('/cases', caseRouter);
app.use('/users', userRouter);
app.use('/auth', authRouter);

module.exports = {
  app,
};