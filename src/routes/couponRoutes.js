const express = require('express');
const router = express.Router();
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupon,
} = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.post('/validate', validateCoupon);
router.get('/active', getActiveCoupon);

module.exports = router;