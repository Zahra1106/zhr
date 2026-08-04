const crypto = require('crypto');
const Order = require('../models/Order');
const SavedDesign = require('../models/SavedDesign');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const { sendPushNotification } = require('../config/firebaseAdmin');
const User = require('../models/users');

// Automatically issues a one-time, exclusive loyalty coupon to a customer
// once they cross either threshold: 5+ delivered orders, or Rs. 20,000+
// total spent (on delivered orders). Skips silently if they already have
// an active personal coupon, so this never double-issues.
async function generateLoyaltyCouponIfEligible(userId) {
  const existing = await Coupon.findOne({ user: userId, isActive: true });
  if (existing) return;

  const deliveredOrders = await Order.find({ user: userId, status: 'Delivered' });
  const totalOrders = deliveredOrders.length;
  const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const isEligible = totalOrders >= 5 || totalSpent >= 20000;
  if (!isEligible) return;

  const code = `LOYAL${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  await Coupon.create({
    code,
    discountPercent: 15,
    minOrderAmount: 0,
    maxDiscountAmount: 2000,
    expiryDate,
    isActive: true,
    usageLimit: 1,
    user: userId,
  });
}


// @desc    Place a new order
// @route   POST /api/orders
exports.placeOrder = async (req, res) => {
  try {
    const {
      designId,
      deliveryAddress,
      paymentMethod,
      couponCode,
      discountAmount,
      pointsToRedeem,
    } = req.body;

    const design = await SavedDesign.findById(designId);
    if (!design) return res.status(404).json({ message: 'Design not found' });

    const subtotal = design.estimatedPrice;
    const couponDiscount = discountAmount || 0;

    // Loyalty points redemption — 1 point = Rs. 1 off, capped so it can
    // never exceed the user's balance or push the order below zero.
    let pointsRedeemed = 0;
    if (pointsToRedeem && pointsToRedeem > 0) {
      const user = await User.findById(req.user.id);
      const maxRedeemable = Math.min(
        user.loyaltyPoints || 0,
        Math.max(0, subtotal - couponDiscount)
      );
      pointsRedeemed = Math.min(pointsToRedeem, maxRedeemable);
    }

    const finalAmount = Math.max(0, subtotal - couponDiscount - pointsRedeemed);

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 14);

    let advanceAmount = 0;
    let remainingAmount = finalAmount;

    if (paymentMethod === 'Advance Transfer') {
      advanceAmount = Math.round(finalAmount * 0.5);
      remainingAmount = finalAmount - advanceAmount;
    }

    const order = await Order.create({
      user: req.user.id,
      design: designId,
      deliveryAddress,
      paymentMethod,
      totalAmount: finalAmount,
      advanceAmount,
      remainingAmount,
      estimatedDeliveryDate,
      couponCode: couponCode || null,
      discountAmount: couponDiscount,
      pointsRedeemed,
    });

    if (pointsRedeemed > 0) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { loyaltyPoints: -pointsRedeemed } });
    }

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase().trim() },
        { $inc: { usedCount: 1 } }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my-orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate({
        path: 'design',
        populate: { path: 'fabric' },
      })
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get delivered orders that still have at least one un-reviewed item
// @route   GET /api/orders/pending-review
exports.getPendingReviewOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id, status: 'Delivered' })
      .populate({ path: 'design', select: 'designName' })
      .sort({ createdAt: -1 });

    const pending = [];

    for (const order of orders) {
      const reviewableItems = [];

      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const itemId = item.itemType === 'product' ? item.product : item.design;
          if (itemId) {
            reviewableItems.push({ itemType: item.itemType, itemId: itemId.toString() });
          }
        });
      } else if (order.design) {
        reviewableItems.push({ itemType: 'design', itemId: order.design._id.toString() });
      }

      if (reviewableItems.length === 0) continue;

      const existingReviews = await Review.find({
        user: req.user.id,
        $or: reviewableItems.map((r) =>
          r.itemType === 'product'
            ? { itemType: 'product', product: r.itemId }
            : { itemType: 'design', design: r.itemId }
        ),
      });

      const reviewedKeys = new Set(
        existingReviews.map((r) => `${r.itemType}:${(r.product || r.design).toString()}`)
      );

      const hasUnreviewed = reviewableItems.some(
        (r) => !reviewedKeys.has(`${r.itemType}:${r.itemId}`)
      );

      if (hasUnreviewed) {
        pending.push({ orderId: order._id.toString(), orderType: order.orderType });
      }
    }

    res.status(200).json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get daily revenue for the last 7 or 30 days (Admin only)
// @route   GET /api/orders/revenue-analytics?days=7
exports.getRevenueAnalytics = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const days = parseInt(req.query.days) === 30 ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: startDate },
    }).select('totalAmount createdAt');

    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    orders.forEach((order) => {
      if (!order.createdAt) return;
      const key = order.createdAt.toISOString().split('T')[0];
      if (dayMap[key] !== undefined) {
        dayMap[key] += order.totalAmount || 0;
      }
    });

    const result = Object.entries(dayMap).map(([date, revenue]) => ({ date, revenue }));
    res.status(200).json(result);
  } catch (error) {
    console.error('getRevenueAnalytics error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'design',
      populate: { path: 'fabric' },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Cancel an order (only allowed before tailoring starts)
// @route   PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.paymentMethod === 'Advance Transfer') {
      return res.status(400).json({
        message: 'This order was paid via JazzCash (Advance Transfer) and cannot be cancelled directly. Please contact support for a refund.',
      });
    }

    const cancellableStatuses = ['Pending', 'Confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        message: `This order can no longer be cancelled (current status: ${order.status}).`,
      });
    }

    order.status = 'Cancelled';
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate({
        path: 'design',
        populate: { path: 'fabric' },
      })
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;

    // Award loyalty points the first time an order reaches "Delivered" —
    // 1 point per Rs. 100 spent. Guarded by pointsAwarded so this can never
    // double-award if the status is saved as "Delivered" more than once.
    if (status === 'Delivered' && !order.pointsAwarded) {
      const pointsEarned = Math.floor(order.totalAmount / 100);
      order.pointsAwarded = true;
      order.pointsEarned = pointsEarned;

      await User.findByIdAndUpdate(order.user, { $inc: { loyaltyPoints: pointsEarned } });
      await generateLoyaltyCouponIfEligible(order.user);
    }

    await order.save();

    const user = await User.findById(order.user);
    if (user?.fcmToken) {
      if (status === 'Delivered') {
        await sendPushNotification(
          user.fcmToken,
          'How was your order?',
          'Your order has been delivered — please give us a review!',
          { type: 'review_prompt', orderId: order._id.toString() }
        );
      } else {
        await sendPushNotification(
          user.fcmToken,
          'Order Status Updated',
          `Your order is now: ${status}`,
          { type: 'order_status', orderId: order._id.toString() }
        );
      }
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Place a cart order (ready-made products and/or custom designs together)
// @route   POST /api/orders/product-order
exports.placeProductOrder = async (req, res) => {
  try {
    const {
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      discountAmount,
      pointsToRedeem,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    const couponDiscount = discountAmount || 0;

    // Loyalty points redemption — 1 point = Rs. 1 off, capped so it can
    // never exceed the user's balance or push the order below zero.
    let pointsRedeemed = 0;
    if (pointsToRedeem && pointsToRedeem > 0) {
      const user = await User.findById(req.user.id);
      const maxRedeemable = Math.min(
        user.loyaltyPoints || 0,
        Math.max(0, subtotal - couponDiscount)
      );
      pointsRedeemed = Math.min(pointsToRedeem, maxRedeemable);
    }

    const totalAmount = Math.max(0, subtotal - couponDiscount - pointsRedeemed);

    const hasProduct = items.some((i) => i.itemType === 'product');
    const hasDesign = items.some((i) => i.itemType === 'design');
    const orderType = hasProduct && hasDesign ? 'mixed' : hasDesign ? 'custom' : 'ready-made';

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (hasDesign ? 14 : 7));

    let advanceAmount = 0;
    let remainingAmount = totalAmount;

    if (paymentMethod === 'Advance Transfer') {
      advanceAmount = Math.round(totalAmount * 0.5);
      remainingAmount = totalAmount - advanceAmount;
    }

    const order = await Order.create({
      user: req.user.id,
      orderType,
      items,
      deliveryAddress,
      paymentMethod,
      totalAmount,
      advanceAmount,
      remainingAmount,
      estimatedDeliveryDate,
      couponCode: couponCode || null,
      discountAmount: couponDiscount,
      pointsRedeemed,
    });

    if (pointsRedeemed > 0) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { loyaltyPoints: -pointsRedeemed } });
    }

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase().trim() },
        { $inc: { usedCount: 1 } }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};