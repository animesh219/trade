const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const wallet = require('../controllers/walletController');

router.get('/', requireAuth, wallet.getMyWallets);
router.post('/deposit', requireAuth, wallet.requestDeposit);
router.post('/withdraw', requireAuth, wallet.requestWithdrawal);
router.get('/transactions', requireAuth, wallet.getMyTransactions);

module.exports = router;
