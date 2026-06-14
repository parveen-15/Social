const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getIo } = require('../socket/ioInstance');
const { uploadChat } = require('../middleware/upload');

const RECALL_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

// Get or create conversation between two users
router.get('/conversation/:userId/:otherId', async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    let conv = await Conversation.findOne({ participants: { $all: [userId, otherId] } })
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('lastMessage');
    if (!conv) {
      conv = new Conversation({ participants: [userId, otherId] });
      await conv.save();
      conv = await Conversation.findById(conv._id)
        .populate('participants', 'username displayName avatar isOnline lastSeen')
        .populate('lastMessage');
    }
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all conversations for a user
router.get('/conversations/:userId', async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.params.userId })
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 });
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete conversation permanently
router.delete('/conversation/:convId', async (req, res) => {
  try {
    await Message.deleteMany({ conversation: req.params.convId });
    await Conversation.findByIdAndDelete(req.params.convId);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages — excludes recalled and deleted-for-me
router.get('/:conversationId', async (req, res) => {
  try {
    const { userId, page = 1, limit = 60 } = req.query;
    const skip = (page - 1) * limit;
    const query = { conversation: req.params.conversationId, recalled: { $ne: true } };
    if (userId) query.deletedFor = { $ne: userId };
    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send text message (REST fallback)
router.post('/', async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;
    const msg = new Message({ conversation: conversationId, sender: senderId, text });
    await msg.save();
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: msg._id, lastMessageTime: new Date() });
    const populated = await Message.findById(msg._id).populate('sender', 'username displayName avatar');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send media message (image or video)
router.post('/media', (req, res, next) => {
  uploadChat.single('media')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}, async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file received — unsupported format?' });

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaUrl = `/uploads/chat/${req.file.filename}`;

    const msg = new Message({
      conversation: conversationId,
      sender: senderId,
      text: text || '',
      image: isVideo ? '' : mediaUrl,
      video: isVideo ? mediaUrl : '',
    });
    await msg.save();
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: msg._id, lastMessageTime: new Date() });

    const populated = await Message.findById(msg._id).populate('sender', 'username displayName avatar');

    // Emit to conversation room so both users see it instantly
    const io = getIo();
    if (io) {
      io.to(`conv_${conversationId}`).emit('new_message', populated);
      const conv = await Conversation.findById(conversationId);
      conv.participants.forEach(pid => {
        if (pid.toString() !== senderId) {
          io.to(`user_${pid}`).emit('conversation_updated', { conversationId, lastMessage: populated });
        }
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put('/:conversationId/read', async (req, res) => {
  try {
    const { userId } = req.body;
    await Message.updateMany(
      { conversation: req.params.conversationId, sender: { $ne: userId }, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recall message — only within 3-minute window
router.patch('/:msgId/recall', async (req, res) => {
  try {
    const { senderId } = req.body;
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender.toString() !== senderId) return res.status(403).json({ error: 'Not your message' });
    if (msg.recalled) return res.status(400).json({ error: 'Already recalled' });

    const age = Date.now() - new Date(msg.createdAt).getTime();
    if (age > RECALL_WINDOW_MS) return res.status(400).json({ error: 'Recall window expired' });

    msg.recalled = true;
    msg.recalledAt = new Date();
    msg.text = '';
    msg.image = '';
    msg.video = '';
    await msg.save();

    const io = getIo();
    if (io) io.to(`conv_${msg.conversation}`).emit('message_recalled', { msgId: msg._id });

    res.json({ message: 'Message recalled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message for me only
router.patch('/:msgId/delete-for-me', async (req, res) => {
  try {
    const { userId } = req.body;
    await Message.findByIdAndUpdate(req.params.msgId, { $addToSet: { deletedFor: userId } });
    res.json({ message: 'Message deleted for you' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
