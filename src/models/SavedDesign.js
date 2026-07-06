const mongoose = require('mongoose');

const savedDesignSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gender: {
      type: String,
      enum: ['women', 'men', 'kids'],
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    fabric: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fabric',
      required: true,
    },
    selectedColor: {
      name: String,
      hexCode: String,
    },
    options: {
      neck: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      sleeve: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      shirtLength: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      trouser: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      dupatta: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      border: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      button: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
      embroidery: { type: mongoose.Schema.Types.ObjectId, ref: 'DesignOption' },
    },
    fabricMeters: {
      type: Number,
      default: 3, // average meters needed for one outfit
    },
    estimatedPrice: {
      type: Number,
      default: 0,
    },
    designName: {
      type: String,
      default: 'My Custom Design',
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedDesign', savedDesignSchema);