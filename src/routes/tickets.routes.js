const express = require('express');
const router = express.Router();
const ticketCtrl = require('../controllers/tickets.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

//student creates ticket
router.post('/', authMiddleware, ticketCtrl.createTicket);

//student listing their tickets
router.get('/my', authMiddleware, ticketCtrl.myTickets);

//ticket details
router.get('/:id', authMiddleware, ticketCtrl.getTicket);

//staff only
router.get('/queue', authMiddleware, roleMiddleware(['AGENT','SUPERVISOR','ADMIN']), ticketCtrl.queue);

//only supervisor/admin
router.patch('/:id/assign', authMiddleware, roleMiddleware(['SUPERVISOR','ADMIN']), ticketCtrl.assign);

module.exports = router;