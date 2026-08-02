const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMyMessages,
  markReadByUser,
  getAllConversations,
  getUserMessages,
  adminSendMessage,
  markReadByAdmin,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// User side
router.post('/send', protect, sendMessage);
router.get('/messages', protect, getMyMessages);
router.put('/read', protect, markReadByUser);

// Admin side
router.get('/conversations', protect, getAllConversations);
router.get('/messages/:userId', protect, getUserMessages);
router.post('/send/:userId', protect, adminSendMessage);
router.put('/read/:userId', protect, markReadByAdmin);

module.exports = router;