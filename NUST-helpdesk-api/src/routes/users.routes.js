const express = require('express');
const router = express.Router();
const userController = require('../controllers/users.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const prisma = require('../prismaClient');

// Get agents — supervisor/admin only
router.get('/agents', authMiddleware, roleMiddleware(['SUPERVISOR', 'ADMIN']), userController.getAgents);

// System stats — admin only
router.get( '/stats', authMiddleware, roleMiddleware(['ADMIN']), userController.getSystemStats);

module.exports = router;