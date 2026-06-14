const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { uploadPost } = require('../middleware/upload');
const { getIo } = require('../socket/ioInstance');

// Get feed posts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const posts = await Post.find()
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user posts
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create post — notify all friends
router.post('/', uploadPost.array('images', 5), async (req, res) => {
  try {
    const { userId, caption } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/posts/${f.filename}`) : [];
    const post = new Post({ user: userId, caption, images });
    await post.save();
    const populated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar');

    // Notify friends
    const user = await User.findById(userId).select('friends displayName');
    const io = getIo();
    if (io && user?.friends?.length) {
      user.friends.forEach(friendId => {
        io.to(`user_${friendId}`).emit('new_friend_post', {
          postId: post._id,
          fromName: user.displayName,
          fromId: userId,
        });
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like / unlike post
router.post('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const liked = post.likes.includes(userId);
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    res.json({ likes: post.likes, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment — notify post owner
router.post('/:id/comment', async (req, res) => {
  try {
    const { userId, text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ user: userId, text });
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar');

    // Notify post owner (not if they commented on their own post)
    if (post.user.toString() !== userId) {
      const commenter = await User.findById(userId).select('displayName');
      const io = getIo();
      if (io) {
        io.to(`user_${post.user}`).emit('new_comment', {
          postId: post._id,
          fromName: commenter?.displayName || 'Someone',
          fromId: userId,
          text,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment
router.delete('/:id/comment/:commentId', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const isCommentOwner = comment.user.toString() === userId;
    const isPostOwner = post.user.toString() === userId;
    if (!isCommentOwner && !isPostOwner) return res.status(403).json({ error: 'Not authorized' });
    comment.deleteOne();
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to a comment
router.post('/:id/comment/:commentId/reply', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    comment.replies.push({ user: userId, text: text.trim() });
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar');

    // Notify the comment owner (if not replying to own comment)
    if (comment.user.toString() !== userId) {
      const replier = await User.findById(userId).select('displayName');
      const io = getIo();
      if (io) {
        io.to(`user_${comment.user}`).emit('new_comment', {
          postId: post._id,
          fromName: replier?.displayName || 'Someone',
          fromId: userId,
          text,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a reply
router.delete('/:id/comment/:commentId/reply/:replyId', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });
    const isReplyOwner = reply.user.toString() === userId;
    const isPostOwner = post.user.toString() === userId;
    if (!isReplyOwner && !isPostOwner) return res.status(403).json({ error: 'Not authorized' });
    reply.deleteOne();
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar')
      .populate('comments.replies.user', 'username displayName avatar');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit post caption
router.patch('/:id', async (req, res) => {
  try {
    const { userId, caption } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });
    post.caption = caption;
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username displayName avatar')
      .populate('comments.user', 'username displayName avatar');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
