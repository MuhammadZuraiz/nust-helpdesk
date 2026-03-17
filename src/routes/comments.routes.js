const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const commentsCtrl = require('../controllers/comments.controller');

// Public comment (student & staff)
router.post('/:id/comments', authMiddleware, commentsCtrl.addPublicComment);

//internal notes only staff only)
router.post('/:id/notes', authMiddleware, roleMiddleware(['AGENT','SUPERVISOR','ADMIN']), commentsCtrl.addInternalNote);

module.exports = router;