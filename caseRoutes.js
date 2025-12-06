const express = require('express');
const {
  retrieveAllCases,
  createCase,
  donateToCase,
} = require('../controllers/caseController.js');

const { verifyToken } = require('../controllers/authController.js');

const caseRouter = express.Router();

//Role-based access middleware 
const restrictTo = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        status: 'fail',
        message: `Access denied: Only ${role}s are allowed`,
      });
    }
    next();
  };
};

// Route to get all cases (protected)
caseRouter.route('/').get(verifyToken, retrieveAllCases);
// Route for beneficiaries to create a case
caseRouter.route('/create').post(verifyToken, restrictTo('beneficiary'), createCase);

// Route for donors to donate to a case
caseRouter.route('/donate').post(verifyToken, restrictTo('donor'), donateToCase);

module.exports = caseRouter;
