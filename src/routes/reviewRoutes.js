const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getDesignReviews,
  canReview,
  deleteReview,
  getAllReviews,
  deleteAllReviews,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Must come before /:id-style routes to avoid path collisions
router.get('/can-review', protect, canReview);
router.get('/product/:productId', getProductReviews);
router.get('/design/:designId', getDesignReviews);
router.get('/', protect, getAllReviews); 

router.post('/', protect, createReview);
router.delete('/:id', protect, deleteReview);
router.delete('/', protect, deleteAllReviews);   // <-- "delete all" — /:id se pehle likhein

module.exports = router;