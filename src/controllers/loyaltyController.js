const Order = require('../models/Order');
const User = require('../models/users');
const Coupon = require('../models/Coupon');

// @desc    Get the logged-in user's loyalty points balance + progress,
//          plus their exclusive loyalty coupon if they've unlocked one
// @route   GET /api/loyalty/status
exports.getMyLoyaltyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('loyaltyPoints');

    const deliveredOrders = await Order.find({ user: req.user.id, status: 'Delivered' });
    const totalOrders = deliveredOrders.length;
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const now = new Date();
    const personalCoupon = await Coupon.findOne({
      user: req.user.id,
      isActive: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    });

    // A usage-limited coupon that's already been fully used shouldn't be shown
    const isCouponUsable =
      personalCoupon &&
      (personalCoupon.usageLimit == null || personalCoupon.usedCount < personalCoupon.usageLimit);

    res.status(200).json({
      loyaltyPoints: user.loyaltyPoints || 0,
      totalOrders,
      totalSpent,
      loyaltyCoupon: isCouponUsable
        ? {
            code: personalCoupon.code,
            discountPercent: personalCoupon.discountPercent,
            maxDiscountAmount: personalCoupon.maxDiscountAmount,
            expiryDate: personalCoupon.expiryDate,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};