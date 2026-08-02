const ChatMessage = require('../models/Chat');
const User = require('../models/users');

// ===== USER SIDE =====

// @desc    Send a message (customer -> admin)
// @route   POST /api/chat/send
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = await ChatMessage.create({
      user: req.user.id,
      sender: 'user',
      text: text.trim(),
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get logged-in user's full conversation with admin
// @route   GET /api/chat/messages
exports.getMyMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.user.id }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Mark admin's messages as read (called when user opens chat screen)
// @route   PUT /api/chat/read
exports.markReadByUser = async (req, res) => {
  try {
    await ChatMessage.updateMany(
      { user: req.user.id, sender: 'admin', read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ===== ADMIN SIDE =====

// @desc    Get list of all conversations (one row per customer, with last message + unread count)
// @route   GET /api/chat/conversations
exports.getAllConversations = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const conversations = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          lastMessage: { $first: '$text' },
          lastSender: { $first: '$sender' },
          lastAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$sender', 'user'] }, { $eq: ['$read', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
    ]);

    // attach basic user info (name/phone) to each conversation
    const userIds = conversations.map((c) => c._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email phone');
    const userMap = {};
    users.forEach((u) => (userMap[u._id.toString()] = u));

    const result = conversations.map((c) => ({
      userId: c._id,
      userName: userMap[c._id.toString()]?.name || 'Unknown',
      userPhone: userMap[c._id.toString()]?.phone || '',
      lastMessage: c.lastMessage,
      lastSender: c.lastSender,
      lastAt: c.lastAt,
      unreadCount: c.unreadCount,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get full conversation with a specific customer
// @route   GET /api/chat/messages/:userId
exports.getUserMessages = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await ChatMessage.find({ user: req.params.userId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Admin sends a message to a specific customer
// @route   POST /api/chat/send/:userId
exports.adminSendMessage = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = await ChatMessage.create({
      user: req.params.userId,
      sender: 'admin',
      text: text.trim(),
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Mark customer's messages as read (called when admin opens that chat)
// @route   PUT /api/chat/read/:userId
exports.markReadByAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await ChatMessage.updateMany(
      { user: req.params.userId, sender: 'user', read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};