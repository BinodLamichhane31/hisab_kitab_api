const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getNotifications);

router.put('/:id/read', protect, markAsRead);

router.put('/read-all', protect, markAllAsRead);

module.exports = router;
