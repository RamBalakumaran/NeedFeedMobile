const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Food = require('../models/Food');
const { protect } = require('../middleware/authMiddleware');

// Middleware to check if user is Admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

// 1. GET ALL USERS
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. DELETE USER
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 3. GET ALL FOOD (Monitoring)
router.get('/food', protect, adminOnly, async (req, res) => {
  try {
    const food = await Food.find({}).populate('donor', 'name email').sort({ createdAt: -1 });
    res.json(food);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 4. DELETE FOOD (Moderation)
router.delete('/food/:id', protect, adminOnly, async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 5. GET ANALYTICS STATS
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFood = await Food.countDocuments();
    const activeDonations = await Food.countDocuments({ expiryTime: { $gt: new Date() } });
    
    // Aggregation for user roles
    const donors = await User.countDocuments({ role: 'donor' });
    const ngos = await User.countDocuments({ role: 'ngo' });
    const volunteers = await User.countDocuments({ role: 'volunteer' });

    res.json({
      totalUsers,
      totalFood,
      activeDonations,
      donors,
      ngos,
      volunteers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;