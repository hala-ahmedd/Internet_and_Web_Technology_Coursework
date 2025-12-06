const express = require('express');
const { createUser, retrieveAllUsers } = require('../controllers/userController.js');
const { verifyToken, verifyAdmin } = require('../controllers/authController.js');

const userRouter = express.Router();

// Route to get all users (admin only)
userRouter.route('/')
  .get(verifyToken, verifyAdmin, retrieveAllUsers);

// Route for user signup (self-registration)
userRouter.route('/signup')
  .post(createUser);

module.exports = userRouter;
