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
      enum: ['custom', 'ready-made', 'mixed'],
      default: 'custom',
    },
    // Kept for backward compatibility with old single-design orders
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavedDesign',
    },
    // Unified items array — can hold ready-made products AND custom designs together
    items: [
      {
        itemType: { type: String, enum: ['product', 'design'], default: 'product' },
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        design: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedDesign' },
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