const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Food = require('../models/Food');
const { protect } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/food', protect, adminOnly, async (req, res) => {
  try {
    const food = await Food.find({})
      .populate('donor', 'name email phone city address profileImage donorType donorFoodCategory availabilityTime')
      .populate('requestedBy', 'name email phone city address profileImage organizationName licenseNumber capacity')
      .populate('assignedVolunteer', 'name email phone city address profileImage vehicleType preferredArea')
      .sort({ createdAt: -1 });

    res.json(food);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/food/:id', protect, adminOnly, async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const totalUsers = await User.countDocuments();
    const donors = await User.countDocuments({ role: 'donor' });
    const ngos = await User.countDocuments({ role: 'ngo' });
    const volunteers = await User.countDocuments({ role: 'volunteer' });

    const totalFood = await Food.countDocuments();
    const activeDonations = await Food.countDocuments({
      status: 'Available',
      expiryTime: { $gt: now },
    });

    const available = await Food.countDocuments({ status: 'Available', expiryTime: { $gt: now } });
    const pending = await Food.countDocuments({ status: 'Pending' });
    const assigned = await Food.countDocuments({ status: 'Assigned' });
    const pickedUp = await Food.countDocuments({ status: 'PickedUp' });
    const delivered = await Food.countDocuments({ status: 'Delivered' });
    const cancelled = await Food.countDocuments({ status: 'Cancelled' });
    const waitingVolunteer = await Food.countDocuments({ status: 'WaitingForVolunteer' });
    const findingVolunteer = await Food.countDocuments({ status: 'FindingVolunteer' });
    const expired = await Food.countDocuments({
      $or: [
        { status: 'Expired' },
        { status: 'Available', expiryTime: { $lt: now } },
      ],
    });

    const veg = await Food.countDocuments({ foodType: 'Veg' });
    const nonVeg = await Food.countDocuments({ foodType: 'Non-Veg' });
    const vegan = await Food.countDocuments({ foodType: 'Vegan' });

    const cooked = await Food.countDocuments({ category: 'Cooked' });
    const raw = await Food.countDocuments({ category: 'Raw' });
    const bakery = await Food.countDocuments({ category: 'Bakery' });
    const packed = await Food.countDocuments({ category: 'Packed' });

    const topDonors = await Food.aggregate([
      {
        $group: {
          _id: '$donor',
          totalPosts: { $sum: 1 },
          deliveredPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
          },
          activePosts: {
            $sum: {
              $cond: [
                {
                  $in: ['$status', ['Available', 'Pending', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit', 'FindingVolunteer', 'WaitingForVolunteer']],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalPosts: -1, deliveredPosts: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          city: '$user.city',
          totalPosts: 1,
          deliveredPosts: 1,
          activePosts: 1,
        },
      },
    ]);

    const topVolunteers = await Food.aggregate([
      { $match: { assignedVolunteer: { $ne: null } } },
      {
        $group: {
          _id: '$assignedVolunteer',
          totalAssignments: { $sum: 1 },
          deliveredAssignments: {
            $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
          },
          liveAssignments: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Assigned', 'PickupStarted', 'PickedUp', 'InTransit']] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { deliveredAssignments: -1, totalAssignments: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          city: '$user.city',
          preferredArea: '$user.preferredArea',
          totalAssignments: 1,
          deliveredAssignments: 1,
          liveAssignments: 1,
        },
      },
    ]);

    const completionRate = totalFood > 0 ? Math.round((delivered / totalFood) * 100) : 0;
    const expiryRate = totalFood > 0 ? Math.round((expired / totalFood) * 100) : 0;

    res.json({
      totalUsers,
      donors,
      ngos,
      volunteers,
      totalFood,
      activeDonations,
      completionRate,
      expiryRate,
      breakdown: {
        available,
        pending,
        assigned,
        pickedUp,
        waitingVolunteer,
        findingVolunteer,
        delivered,
        cancelled,
        expired,
      },
      types: {
        veg,
        nonVeg,
        vegan,
      },
      categories: {
        cooked,
        raw,
        bakery,
        packed,
      },
      topDonors,
      topVolunteers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
