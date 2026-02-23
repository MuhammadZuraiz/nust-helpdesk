const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const jobsCtrl = require('../controllers/jobs.controller');

//protected endpoint for SLA checks by admin/supervisor
router.post('/run-sla-check', authMiddleware, roleMiddleware(['SUPERVISOR','ADMIN']), jobsCtrl.runSlaCheckEndpoint);

module.exports = router;