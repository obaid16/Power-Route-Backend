const express = require('express');
const { getNotifications, markRead, markAllRead, deleteNotification, clearAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.delete('/clear', clearAll);
router.patch('/:notificationId/read', [param('notificationId').isMongoId()], validate, markRead);
router.delete('/:notificationId', [param('notificationId').isMongoId()], validate, deleteNotification);

module.exports = router;
