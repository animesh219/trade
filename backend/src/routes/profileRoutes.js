const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const profile = require('../controllers/profileController');

router.put('/', requireAuth, profile.updateProfile);
router.post('/change-password', requireAuth, profile.changePassword);

module.exports = router;
