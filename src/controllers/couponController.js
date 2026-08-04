const Coupon = require('../models/Coupon');

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create coupon (Admin)
// @route   POST /api/coupons
exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update coupon (Admin)
// @route   PUT /api/coupons/:id
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Validate a coupon code against an order amount (used at checkout)
// @route   POST /api/coupons/validate
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || orderAmount == null) {
      return res.status(400).json({ message: 'Coupon code and order amount are required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ message: 'This coupon is no longer active' });
    }
    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    }
    // Personal loyalty coupons can only be used by the customer they were issued to
    if (coupon.user && coupon.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This coupon is not valid for your account' });
    }
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `This coupon requires a minimum order of Rs. ${coupon.minOrderAmount}`,
      });
    }

    let discountAmount = Math.round((orderAmount * coupon.discountPercent) / 100);
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    res.status(200).json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount,
      finalAmount: orderAmount - discountAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get the best active PUBLIC coupon to display to customers
//          (excludes personal loyalty coupons, which show up separately)
// @route   GET /api/coupons/active
exports.getActiveCoupon = async (req, res) => {
  try {
    const now = new Date();
    const coupon = await Coupon.findOne({
      isActive: true,
      user: null,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    }).sort({ discountPercent: -1 });

    if (!coupon) return res.status(200).json(null);

    res.status(200).json({
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      minOrderAmount: coupon.minOrderAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};