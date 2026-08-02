const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    itemType: {
      type: String,
      enum: ['product', 'design'],
      required: true,
    },
    // Only one of these will be set, depending on itemType
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavedDesign',
    },
    // The order that proves this user actually purchased the item
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// A user can only review the same product once
reviewSchema.index(
  { user: 1, product: 1 },
  { unique: true, partialFilterExpression: { itemType: 'product' } }
);
// A user can only review the same design once
reviewSchema.index(
  { user: 1, design: 1 },
  { unique: true, partialFilterExpression: { itemType: 'design' } }
);

module.exports = mongoose.model('Review', reviewSchema);