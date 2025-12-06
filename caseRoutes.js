const express = require('express');
const {
  createcase,
  retrieveAllcases,
} = require('../controllers/caseController.js');

const { verifyToken, verifyAdmin } = require('../controllers/authController.js'); // import it

const caseRouter = express.Router();

// All trips
caseRouter
  .route('/')
  .post(verifyAdmin, createcase)        // Add new trip
  .get(verifyToken, retrieveAllcases);  // Get all trips for authenticated users


module.exports = caseRouter; 