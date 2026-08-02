const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    // The customer this conversation belongs to (set whether admin or user sent it)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);