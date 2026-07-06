const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const kyc = require('../controllers/kycController');

router.post('/documents', requireAuth, upload.single('document'), kyc.uploadDocument);
router.get('/documents', requireAuth, kyc.getMyDocuments);

module.exports = router;
