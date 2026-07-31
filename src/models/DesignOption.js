const mongoose = require('mongoose');

const designOptionSchema = new mongoose.Schema(
  {
    category: {
  type: String,
  enum: [
    'neck', 'sleeve', 'shirtLength', 'trouser',
    'dupatta', 'border', 'button', 'embroidery', 'print',
    'pocketStyle', 'backStyle', 'cuffStyle', 'sideCutStyle', 'style',
  ],
  required: true,
},
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    extraCost: {
      type: Number,
      default: 0,
    },
    suitableFor: [
      {
        type: String,
        enum: ['women', 'men', 'kids'],
      },
    ],
    appliesToCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null, // null/empty = generic, shows for ALL clothing categories
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DesignOption', designOptionSchema);