const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['women', 'men', 'kids'],
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    // When true, this category (e.g. Bridal Wear, Groom Sherwani) can only
    // be ordered with a 50% advance payment — COD is blocked for it, since
    // these are expensive, made-to-order pieces the shop can't easily resell
    // if a customer backs out after tailoring starts.
    requiresAdvancePayment: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);