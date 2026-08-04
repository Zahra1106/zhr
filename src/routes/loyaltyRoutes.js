const express = require('express');
const router = express.Router();
const { getMyLoyaltyStatus } = require('../controllers/loyaltyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/status', protect, getMyLoyaltyStatus);

module.exports = router;