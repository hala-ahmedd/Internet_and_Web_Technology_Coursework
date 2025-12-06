const express = require('express');
const {
  createUser,
  retrieveAllUsers,
} = require('../controllers/userController.js');

const { verifyAdmin } = require('../controllers/authController.js'); // import it


const userRouter = express.Router();

// Apply verifyAdmin to all routes in this router
userRouter.use(verifyAdmin)

// All users
userRouter
  .route('/')
  .get(retrieveAllUsers)   // Get all users
  .post(createUser);       // Add new user

module.exports = userRouter;
