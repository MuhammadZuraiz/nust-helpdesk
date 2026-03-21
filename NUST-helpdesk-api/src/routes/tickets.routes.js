const express = require('express');
const router = express.Router();
const ticketCtrl = require('../controllers/tickets.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.post('/', authMiddleware, ticketCtrl.createTicket);
router.get('/my', authMiddleware, ticketCtrl.myTickets);
router.get('/queue', authMiddleware, roleMiddleware(['AGENT', 'SUPERVISOR', 'ADMIN']), ticketCtrl.queue);
router.get('/:id', authMiddleware, ticketCtrl.getTicket);
router.patch('/:id/assign', authMiddleware, roleMiddleware(['SUPERVISOR', 'ADMIN']), ticketCtrl.assign);

module.exports = router;
