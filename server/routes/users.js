const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { uploadProfile } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { getIo } = require('../socket/ioInstance');

// Get all users (for demo/match feature)
router.get('/', async (req, res) => {
  try {
    const { search, exclude } = req.query;
    let query = {};
    if (search) query.username = { $regex: search, $options: 'i' };
    if (exclude) query._id = { $ne: exclude };
    const users = await User.find(query).select('-blockedUsers -socketId').limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find user by username, displayName, or MongoDB ID (case-insensitive)
router.get('/by/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const ci = new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    let user = await User.findOne({ $or: [{ username: ci }, { displayName: ci }] })
      .populate('friends', 'username displayName avatar isOnline')
      .select('-blockedUsers -socketId');

    if (!user && /^[a-f\d]{24}$/i.test(identifier)) {
      user = await User.findById(identifier)
        .populate('friends', 'username displayName avatar isOnline')
        .select('-blockedUsers -socketId');
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'username displayName avatar isOnline')
      .select('-blockedUsers -socketId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create demo user
router.post('/create', async (req, res) => {
  try {
    const { username, displayName } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.json(existing);
    const user = new User({ username, displayName });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/:id', async (req, res) => {
  try {
    const { displayName, bio, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { displayName, bio, email, phone },
      { new: true }
    ).populate('friends', 'username displayName avatar isOnline');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload avatar
router.post('/:id/avatar', uploadProfile.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old avatar if exists
    if (user.avatar) {
      const oldPath = path.join(__dirname, '../uploads/profiles', path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const base = process.env.SERVER_URL || '';
    user.avatar = `${base}/uploads/profiles/${req.file.filename}`;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload additional photos
router.post('/:id/photos', uploadProfile.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const base = process.env.SERVER_URL || '';
    const newPhotos = req.files.map(f => `${base}/uploads/profiles/${f.filename}`);
    user.photos.push(...newPhotos);
    await user.save();
    res.json({ photos: user.photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a photo
router.delete('/:id/photos/:photoIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const idx = parseInt(req.params.photoIndex);
    if (idx < 0 || idx >= user.photos.length) return res.status(400).json({ error: 'Invalid photo index' });

    const photoPath = path.join(__dirname, '../', user.photos[idx]);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    user.photos.splice(idx, 1);
    await user.save();
    res.json({ photos: user.photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send friend request
router.post('/:id/friend-request/:targetId', async (req, res) => {
  try {
    const { id, targetId } = req.params;
    const user = await User.findById(id);
    const target = await User.findById(targetId);
    if (!user || !target) return res.status(404).json({ error: 'User not found' });
    if (user.sentRequests.includes(targetId)) return res.json({ message: 'Request already sent' });
    if (user.friends.includes(targetId)) return res.json({ message: 'Already friends' });

    user.sentRequests.push(targetId);
    target.friendRequests.push(id);
    await user.save();
    await target.save();

    // Notify target via socket
    const io = getIo();
    if (io) {
      io.to(`user_${targetId}`).emit('friend_request_received', {
        from: { _id: user._id, displayName: user.displayName, username: user.username, avatar: user.avatar },
        fromName: user.displayName,
      });
    }

    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept friend request
router.post('/:id/accept-request/:requesterId', async (req, res) => {
  try {
    const { id, requesterId } = req.params;
    const user = await User.findById(id);
    const requester = await User.findById(requesterId);
    if (!user || !requester) return res.status(404).json({ error: 'User not found' });

    user.friendRequests = user.friendRequests.filter(r => r.toString() !== requesterId);
    requester.sentRequests = requester.sentRequests.filter(r => r.toString() !== id);
    if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
    if (!requester.friends.includes(id)) requester.friends.push(id);
    await user.save();
    await requester.save();

    const updated = await User.findById(id).populate('friends', 'username displayName avatar isOnline');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decline/cancel friend request
router.post('/:id/decline-request/:requesterId', async (req, res) => {
  try {
    const { id, requesterId } = req.params;
    const user = await User.findById(id);
    const requester = await User.findById(requesterId);
    if (!user || !requester) return res.status(404).json({ error: 'User not found' });

    user.friendRequests = user.friendRequests.filter(r => r.toString() !== requesterId);
    requester.sentRequests = requester.sentRequests.filter(r => r.toString() !== id);
    await user.save();
    await requester.save();
    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove friend
router.delete('/:id/friends/:friendId', async (req, res) => {
  try {
    const { id, friendId } = req.params;
    await User.findByIdAndUpdate(id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: id } });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
