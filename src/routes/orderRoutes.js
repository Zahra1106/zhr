const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  placeProductOrder,
  getPendingReviewOrders,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, placeOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/pending-review', protect, getPendingReviewOrders);
router.get('/all', protect, getAllOrders);
router.put('/:id/status', protect, updateOrderStatus);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);
router.post('/product-order', protect, placeProductOrder);
router.get('/revenue-analytics', protect, getRevenueAnalytics);

module.exports = router;