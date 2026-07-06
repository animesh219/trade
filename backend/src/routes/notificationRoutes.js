const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const notif = require('../controllers/notificationController');

router.get('/', requireAuth, notif.getMyNotifications);
router.post('/:id/read', requireAuth, notif.markAsRead);

module.exports = router;
