/**
 * User Routes
 * 
 * Handles user authentication and profile management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Register a new user
router.post('/register', userController.register);

// Login user
router.post('/login', userController.login);

// Get user profile
router.get('/profile', userController.protect, userController.getProfile);

// Update user profile
router.put('/profile', userController.protect, userController.updateProfile);

module.exports = router;
