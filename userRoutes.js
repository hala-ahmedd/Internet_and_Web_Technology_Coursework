const express = require('express');
const {
  createUser,
  retrieveAllUsers,
  deactivateAccount,
  verifyBeneficiaryDocs,
  getProfile,
  viewUserDonations
} = require('../controllers/userController.js');
const { verifyToken, verifyAdmin } = require('../controllers/authController.js');

const userRouter = express.Router();

userRouter.route('/')
  .get(verifyToken, verifyAdmin, retrieveAllUsers);

userRouter.route('/signup')
  .post(createUser);

userRouter.route('/:id/deactivate')
  .put(verifyToken, deactivateAccount);

userRouter.route('/:id/verify-document')
  .put(verifyToken, verifyAdmin, verifyBeneficiaryDocs);

userRouter.route('/me')
  .get(verifyToken, getProfile);

userRouter.route('/me/donations')
  .get(verifyToken, viewUserDonations);

module.exports = userRouter;
