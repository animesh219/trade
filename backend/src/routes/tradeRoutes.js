const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const trade = require('../controllers/tradeController');

router.get('/markets', trade.getMarketWatchlist);
router.get('/markets/:symbol', trade.getSymbolPrice);
router.post('/orders', requireAuth, trade.placeOrder);
router.get('/orders', requireAuth, trade.getMyOrders);

module.exports = router;
