const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const statusCtrl = require('../controllers/status.controller');

// change status (agent, supervisor, admin, student where allowed by rules)
router.patch('/:id/status', authMiddleware, statusCtrl.changeStatus);

// convenience endpoints
router.patch('/:id/cancel', authMiddleware, statusCtrl.cancelTicket);
router.patch('/:id/reopen', authMiddleware, statusCtrl.reopenTicket);
router.patch('/:id/close', authMiddleware, statusCtrl.closeTicket);

module.exports = router;
