const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const caseRouter = require('./routes/caseroutes.js');
const userRouter = require('./routes/userRoutes.js');
const authRouter = require('./routes/authRoutes.js');

// Load environment variables from .env file
dotenv.config();

// Create an instance of the Express application
const app = express();

// Enable CORS
app.use(cors());

// Use middleware to parse JSON data from request bodies
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

// API routes
app.use('/cases', caseRouter);
app.use('/users', userRouter);
app.use('/auth', authRouter);

module.exports = { app };
