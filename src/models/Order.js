const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderType: {
      type: String,
      enum: ['custom', 'ready-made'],
      default: 'custom',
    },
    // For custom design orders
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavedDesign',
    },
    // For ready-made product orders (cart)
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        image: String,
        size: String,
        quantity: { type: Number, default: 1 },
        price: Number,
      },
    ],
    deliveryAddress: {
      label: String,
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      province: String,
      postalCode: String,
      phone: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Advance Transfer'],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'In Tailoring', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    estimatedDeliveryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);