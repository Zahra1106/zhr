const SavedDesign = require('../models/SavedDesign');
const User = require('../models/users');
const { sendPushNotification } = require('../config/firebaseAdmin');

// @desc  When a fabric's discountPercent increases, tell every user who has
//        a saved design (made with that fabric) sitting in their wishlist —
//        their wishlisted item just got cheaper.
async function notifyWishlistOnFabricDiscount(fabric) {
  try {
    if (!fabric || !fabric.discountPercent || fabric.discountPercent <= 0) return;

    const designs = await SavedDesign.find({ fabric: fabric._id }).select('_id');
    if (!designs.length) return;

    const designIds = designs.map((d) => d._id);

    const users = await User.find({
      wishlist: { $in: designIds },
      fcmToken: { $ne: '' },
    }).select('fcmToken');

    if (!users.length) return;

    await Promise.all(
      users.map((user) =>
        sendPushNotification(
          user.fcmToken,
          'Your wishlist is on sale! 🎉',
          `${fabric.name} just got a ${fabric.discountPercent}% discount — a design in your wishlist is now cheaper.`,
          { type: 'wishlist_discount', fabricId: fabric._id.toString() }
        )
      )
    );
  } catch (error) {
    console.error('Wishlist discount notification error:', error.message);
  }
}

module.exports = { notifyWishlistOnFabricDiscount };