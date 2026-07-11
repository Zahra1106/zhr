const User = require('../models/users');
const Category = require('../models/Category');
const Fabric = require('../models/Fabric');
const Order = require('../models/Order');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [totalCategories, totalFabrics, totalOrders, totalUsers, orders] = await Promise.all([
      Category.countDocuments(),
      Fabric.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Order.find(),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;

    res.status(200).json({
      totalCategories,
      totalFabrics,
      totalOrders,
      totalUsers,
      totalRevenue,
      pendingOrders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};