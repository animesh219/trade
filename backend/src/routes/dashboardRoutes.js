const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');

router.get('/overview', requireAuth, dashboard.getOverview);

module.exports = router;
