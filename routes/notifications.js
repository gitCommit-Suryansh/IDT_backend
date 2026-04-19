const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications/send
// Protected by admin secret key header
router.post('/send', (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid admin key.' });
  }
  next();
}, notificationController.sendNotification);

module.exports = router;
