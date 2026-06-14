const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

/* POST /api/auth/sync
   Called right after Firebase login/signup.
   Verifies the ID token, finds or creates the MongoDB user,
   and returns the full user object.
*/
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture, phone_number } = req.firebaseUser;
    const { provider = 'email' } = req.body;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // First-ever login — create a minimal user (onboarding will fill the rest)
      user = await User.create({
        firebaseUid:  uid,
        displayName:  name || email?.split('@')[0] || 'New User',
        email:        email || '',
        phone:        phone_number || '',
        avatar:       picture || '',
        provider,
        onboardingComplete: false,
      });
    } else {
      // Keep avatar/email fresh from Firebase
      const updates = {};
      if (email   && email   !== user.email)  updates.email  = email;
      if (picture && picture !== user.avatar) updates.avatar = picture;
      if (Object.keys(updates).length) await User.findByIdAndUpdate(user._id, updates);
    }

    res.json(await User.findById(user._id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* PATCH /api/auth/profile
   Completes the onboarding step.
*/
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { username, displayName, bio } = req.body;
    if (!username?.trim() || !displayName?.trim()) {
      return res.status(400).json({ error: 'Username and display name are required' });
    }

    // Check username uniqueness
    const taken = await User.findOne({
      username: username.trim().toLowerCase(),
      firebaseUid: { $ne: req.firebaseUid },
    });
    if (taken) return res.status(409).json({ error: 'Username is already taken' });

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUid },
      {
        username:           username.trim().toLowerCase(),
        displayName:        displayName.trim(),
        bio:                bio?.trim() || '',
        onboardingComplete: true,
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/auth/me
   Returns the current user from the token (used on app reload).
*/
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
