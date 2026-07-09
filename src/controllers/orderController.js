const Order = require('../models/Order');
const SavedDesign = require('../models/SavedDesign');

// @desc    Place a new order
// @route   POST /api/orders
exports.placeOrder = async (req, res) => {
  try {
    const { designId, deliveryAddress, paymentMethod } = req.body;

    const design = await SavedDesign.findById(designId);
    if (!design) return res.status(404).json({ message: 'Design not found' });

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 14);

    let advanceAmount = 0;
    let remainingAmount = design.estimatedPrice;

    if (paymentMethod === 'Advance Transfer') {
      advanceAmount = Math.round(design.estimatedPrice * 0.5);
      remainingAmount = design.estimatedPrice - advanceAmount;
    }

    const order = await Order.create({
      user: req.user.id,
      design: designId,
      deliveryAddress,
      paymentMethod,
      totalAmount: design.estimatedPrice,
      advanceAmount,
      remainingAmount,
      estimatedDeliveryDate,
    });

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

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};