const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavedDesign',
      required: true,
    },
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
advanceAmount: {
  type: Number,
  default: 0,
},
remainingAmount: {
  type: Number,
  default: 0,
},
    totalAmount: {
      type: Number,
      required: true,
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