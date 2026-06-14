const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Track users waiting for random video call
const videoQueue = [];
// Track active video call pairs: { socketId -> socketId }
const activeCalls = new Map();

module.exports = (io) => {
  io.on('connection', async (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== 'undefined') {
      await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id, lastSeen: new Date() });
      socket.userId = userId;
      socket.join(`user_${userId}`);
      io.emit('user_online', { userId, isOnline: true });
    }

    // ─── Chat ─────────────────────────────────────────────────────────────
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, senderId, text } = data;
        const msg = new Message({ conversation: conversationId, sender: senderId, text: text || '' });
        await msg.save();
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: msg._id,
          lastMessageTime: new Date(),
        });
        const populated = await Message.findById(msg._id)
          .populate('sender', 'username displayName avatar');
        io.to(`conv_${conversationId}`).emit('new_message', populated);

        const conv = await Conversation.findById(conversationId);
        conv.participants.forEach(pid => {
          if (pid.toString() !== senderId) {
            io.to(`user_${pid}`).emit('conversation_updated', {
              conversationId,
              lastMessage: populated,
            });
          }
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', { userId, isTyping });
    });

    // ─── Random Video Call (WebRTC signaling) ─────────────────────────────
    socket.on('join_video_queue', () => {
      const idx = videoQueue.findIndex(s => s.id === socket.id);
      if (idx !== -1) videoQueue.splice(idx, 1);

      if (videoQueue.length > 0) {
        const peer = videoQueue.shift();
        activeCalls.set(socket.id, peer.id);
        activeCalls.set(peer.id, socket.id);
        socket.emit('video_matched', { peerId: peer.id, isInitiator: true });
        peer.emit('video_matched', { peerId: socket.id, isInitiator: false });
      } else {
        videoQueue.push(socket);
        socket.emit('video_waiting');
      }
    });

    socket.on('leave_video_queue', () => {
      const idx = videoQueue.findIndex(s => s.id === socket.id);
      if (idx !== -1) videoQueue.splice(idx, 1);
    });

    socket.on('video_signal', ({ to, signal }) => {
      io.to(to).emit('video_signal', { from: socket.id, signal });
    });

    socket.on('video_next', () => {
      const peerId = activeCalls.get(socket.id);
      if (peerId) {
        io.to(peerId).emit('video_peer_left');
        activeCalls.delete(peerId);
        activeCalls.delete(socket.id);
      }
      if (videoQueue.length > 0) {
        const peer = videoQueue.shift();
        activeCalls.set(socket.id, peer.id);
        activeCalls.set(peer.id, socket.id);
        socket.emit('video_matched', { peerId: peer.id, isInitiator: true });
        peer.emit('video_matched', { peerId: socket.id, isInitiator: false });
      } else {
        videoQueue.push(socket);
        socket.emit('video_waiting');
      }
    });

    socket.on('video_end_call', () => {
      const peerId = activeCalls.get(socket.id);
      if (peerId) {
        io.to(peerId).emit('video_peer_left');
        activeCalls.delete(peerId);
        activeCalls.delete(socket.id);
      }
    });

    socket.on('video_report', ({ reportedId, reason }) => {
      console.log(`User ${socket.userId} reported ${reportedId}: ${reason}`);
      socket.emit('report_received');
    });

    // ─── Friend-to-Friend Video Call ──────────────────────────────────────
    socket.on('call_user', async ({ targetUserId, callerInfo }) => {
      try {
        const target = await User.findById(targetUserId);
        if (!target || !target.socketId) {
          return socket.emit('call_failed', { reason: 'User is offline' });
        }
        // Register this as an active call attempt
        activeCalls.set(socket.id, target.socketId);
        activeCalls.set(target.socketId, socket.id);

        io.to(target.socketId).emit('incoming_call', {
          from: socket.id,
          fromUserId: socket.userId,
          callerInfo,
        });
      } catch {
        socket.emit('call_failed', { reason: 'Could not reach user' });
      }
    });

    socket.on('call_accepted', ({ to }) => {
      io.to(to).emit('call_accepted', { from: socket.id });
    });

    socket.on('call_declined', ({ to }) => {
      activeCalls.delete(socket.id);
      activeCalls.delete(to);
      io.to(to).emit('call_declined');
    });

    socket.on('call_ended', ({ to }) => {
      activeCalls.delete(socket.id);
      if (to) {
        activeCalls.delete(to);
        io.to(to).emit('call_ended');
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const qIdx = videoQueue.findIndex(s => s.id === socket.id);
      if (qIdx !== -1) videoQueue.splice(qIdx, 1);

      const peerId = activeCalls.get(socket.id);
      if (peerId) {
        io.to(peerId).emit('video_peer_left');
        io.to(peerId).emit('call_ended');
        activeCalls.delete(peerId);
        activeCalls.delete(socket.id);
      }

      if (userId && userId !== 'undefined') {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date(), socketId: '' });
        io.emit('user_online', { userId, isOnline: false });
      }
    });
  });
};
