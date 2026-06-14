const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid:        { type: String, unique: true, sparse: true },
  username:           { type: String, unique: true, sparse: true, trim: true },
  displayName:        { type: String, required: true, trim: true },
  email:              { type: String, trim: true, default: '' },
  phone:              { type: String, trim: true, default: '' },
  bio:                { type: String, default: '' },
  avatar:             { type: String, default: '' },
  provider:           { type: String, enum: ['email', 'google', 'phone', 'facebook'], default: 'email' },
  onboardingComplete: { type: Boolean, default: false },
  photos:             [{ type: String }],
  friends:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentRequests:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isOnline:           { type: Boolean, default: false },
  lastSeen:           { type: Date, default: Date.now },
  socketId:           { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
