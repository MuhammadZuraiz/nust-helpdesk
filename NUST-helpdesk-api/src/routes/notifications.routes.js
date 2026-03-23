const express  = require('express');
const router   = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { getUnreadNotifications, markAllRead } = require('../services/notification.service');

// Get unread notifications for the logged in user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await getUnreadNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.patch('/read', authMiddleware, async (req, res, next) => {
  try {
    await markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;