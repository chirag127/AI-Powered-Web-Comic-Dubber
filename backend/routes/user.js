const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Get user profile
router.get('/profile', authMiddleware, userController.getProfile);

// Update user profile
router.put('/profile', authMiddleware, userController.updateProfile);

// Get user settings
router.get('/settings', authMiddleware, userController.getSettings);

// Update user settings
router.put('/settings', authMiddleware, userController.updateSettings);

module.exports = router;
