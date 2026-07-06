const mongoose = require('mongoose');

const fabricSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'Lawn', 'Cotton', 'Linen', 'Silk', 'Chiffon',
        'Organza', 'Net', 'Velvet', 'Jamawar', 'Raw Silk',
        'Khaddar', 'Marina',
      ],
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    textureImage: {
      type: String,
      default: '',
    },
    pricePerMeter: {
      type: Number,
      required: true,
    },
    quality: {
      type: String,
      enum: ['Standard', 'Premium', 'Luxury'],
      default: 'Standard',
    },
    availableColors: [
      {
        name: String,
        hexCode: String,
      },
    ],
    suitableFor: [
      {
        type: String,
        enum: ['women', 'men', 'kids'],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fabric', fabricSchema);