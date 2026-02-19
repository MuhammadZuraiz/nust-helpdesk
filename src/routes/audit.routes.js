const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const auditCtrl = require('../controllers/audit.controller');

router.get('/:id/audit', authMiddleware, roleMiddleware(['AGENT','SUPERVISOR','ADMIN']), auditCtrl.getAuditForTicket);

module.exports = router;
