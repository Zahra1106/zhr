const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  signup, login, getMe, updateMeasurements,
  toggleWishlist, getWishlist, addAddress, getAddresses, deleteAddress,
  resetPassword, googleLogin,
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/measurements', protect, updateMeasurements);
router.post('/wishlist/:designId', protect, toggleWishlist);
router.get('/wishlist', protect, getWishlist);
router.post('/addresses', protect, addAddress);
router.get('/addresses', protect, getAddresses);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.post('/reset-password', resetPassword);
router.post('/google-login', googleLogin);
module.exports = router;