const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const admin = require('../controllers/adminController');

router.use(requireAuth, requireRole('admin'));

router.get('/analytics', admin.getAnalytics);

router.get('/users', admin.listUsers);
router.put('/users/:id/status', admin.setUserStatus);

router.get('/kyc/pending', admin.listPendingKyc);
router.put('/kyc/:id/review', admin.reviewKyc);

router.get('/transactions/pending', admin.listPendingTransactions);
router.put('/transactions/:id/review', admin.reviewTransaction);

router.get('/orders', admin.listAllOrders);

router.post('/notifications/broadcast', admin.broadcastNotification);

router.get('/audit-logs', admin.getAuditLogs);

module.exports = router;
