/**
 * Index Routes
 */

const express = require('express');
const router = express.Router();

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Powered Web Comic Dubber API',
    version: '1.0.0'
  });
});

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
