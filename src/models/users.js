const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: '',
    },
    measurements: {
      chest: Number,
      waist: Number,
      hips: Number,
      shoulder: Number,
      sleeveLength: Number,
      shirtLength: Number,
      inseam: Number,
    },
    addresses: [
      {
        label: String, // Home, Office, etc.
        addressLine: String,
        city: String,
        province: String,
        postalCode: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SavedDesign' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);