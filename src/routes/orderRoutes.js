const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  getOrderInvoice,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  placeProductOrder,
  getPendingReviewOrders,
  getRevenueAnalytics,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, placeOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/pending-review', protect, getPendingReviewOrders);
router.get('/all', protect, getAllOrders);
router.get('/revenue-analytics', protect, getRevenueAnalytics);
router.put('/:id/status', protect, updateOrderStatus);
router.get('/:id/invoice', protect, getOrderInvoice);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);
router.post('/product-order', protect, placeProductOrder);

module.exports = router;