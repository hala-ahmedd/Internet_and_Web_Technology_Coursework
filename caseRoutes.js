const express = require('express');
const {
  retrieveAllCases,
  getCaseById,
  searchCases,
  createCase,
  updateCase,
  deleteCase,
  donateToCase
} = require('../controllers/caseController.js');
const { verifyBeneficiary, verifyDonor, verifyToken } = require('../controllers/authController.js');

const caseRouter = express.Router();

caseRouter.get('/', retrieveAllCases);
caseRouter.get('/search', searchCases);
caseRouter.get('/:id', getCaseById);

caseRouter.post('/create', verifyBeneficiary, createCase);
caseRouter.put('/:id', verifyToken, updateCase);
caseRouter.delete('/:id', verifyToken, deleteCase);
caseRouter.post('/donate', verifyDonor, donateToCase);

module.exports = caseRouter;
