const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.put('/push-token', protect, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    await User.updateMany(
      { _id: { $ne: req.user.id } },
      { $pull: { fcmTokens: token } }
    );

    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { fcmTokens: token } },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Push token save error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/push-token', protect, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { fcmTokens: token } },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Push token remove error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Notification read-all error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
