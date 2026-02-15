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
// 5. GET DETAILED ANALYTICS STATS
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // 1. User Counts
    const totalUsers = await User.countDocuments();
    const donors = await User.countDocuments({ role: 'donor' });
    const ngos = await User.countDocuments({ role: 'ngo' });
    const volunteers = await User.countDocuments({ role: 'volunteer' });

    // 2. Food General Counts
    const totalFood = await Food.countDocuments();
    const activeDonations = await Food.countDocuments({ status: 'Available', expiryTime: { $gt: new Date() } });

    // 3. Food Status Breakdown
    const delivered = await Food.countDocuments({ status: 'Delivered' });
    const pending = await Food.countDocuments({ status: 'Pending' });
    const expired = await Food.countDocuments({ 
        $or: [
            { status: 'Expired' },
            { status: 'Available', expiryTime: { $lt: new Date() } }
        ]
    });

    // 4. Food Type Breakdown
    const veg = await Food.countDocuments({ foodType: 'Veg' });
    const nonVeg = await Food.countDocuments({ foodType: 'Non-Veg' });

    res.json({
      totalUsers,
      donors,
      ngos,
      volunteers,
      totalFood,
      activeDonations,
      breakdown: {
        delivered,
        pending,
        expired
      },
      types: {
        veg,
        nonVeg
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;