const Review = require('../models/Review');
const Order = require('../models/Order');

// Checks whether this user has a non-cancelled order containing the given
// product or design. Covers both the old single-design order flow and the
// newer unified items[] cart flow. Returns the matching order's ID, or null.
async function findPurchaseOrder(userId, itemType, itemId) {
  const query = {
    user: userId,
    status: { $ne: 'Cancelled' },
  };

  if (itemType === 'product') {
    query['items.product'] = itemId;
    query['items.itemType'] = 'product';
  } else {
    query.$or = [
      { design: itemId }, // old single-design orders
      { 'items.design': itemId, 'items.itemType': 'design' }, // cart orders
    ];
  }

  const order = await Order.findOne(query);
  return order ? order._id : null;
}

// @desc    Create a review (only allowed for items the user has purchased)
// @route   POST /api/reviews
exports.createReview = async (req, res) => {
  try {
    const { itemType, itemId, rating, comment } = req.body;

    if (!itemType || !['product', 'design'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const orderId = await findPurchaseOrder(req.user.id, itemType, itemId);
    if (!orderId) {
      return res.status(403).json({
        message: 'You can only review items you have purchased',
      });
    }

    const existing = await Review.findOne({
      user: req.user.id,
      itemType,
      [itemType]: itemId,
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this item' });
    }

    const review = await Review.create({
      user: req.user.id,
      itemType,
      [itemType]: itemId,
      order: orderId,
      rating,
      comment: comment || '',
    });

    const populated = await review.populate('user', 'name');
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this item' });
    }
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all reviews for a product, with average rating (public)
// @route   GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ itemType: 'product', product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    res.status(200).json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all reviews for a design, with average rating (public)
// @route   GET /api/reviews/design/:designId
exports.getDesignReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ itemType: 'design', design: req.params.designId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    res.status(200).json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Check if the logged-in user is allowed to review this item
//          (purchased it, and hasn't already reviewed it)
// @route   GET /api/reviews/can-review?itemType=product&itemId=xxx
exports.canReview = async (req, res) => {
  try {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId) {
      return res.status(400).json({ message: 'itemType and itemId are required' });
    }

    const orderId = await findPurchaseOrder(req.user.id, itemType, itemId);
    if (!orderId) {
      return res.status(200).json({ canReview: false, reason: 'not_purchased' });
    }

    const existing = await Review.findOne({
      user: req.user.id,
      itemType,
      [itemType]: itemId,
    });
    if (existing) {
      return res.status(200).json({ canReview: false, reason: 'already_reviewed' });
    }

    res.status(200).json({ canReview: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a review (owner can delete their own; admin can delete any)
// @route   DELETE /api/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = review.user.toString() === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all reviews (Admin only) — for moderation in admin panel
// @route   GET /api/reviews
exports.getAllReviews = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name')
      .populate('design', 'designName')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// @desc    Delete ALL reviews (Admin only)
// @route   DELETE /api/reviews
exports.deleteAllReviews = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Review.deleteMany({});
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};