const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary'); // Reuse your existing Cloudinary setup
const User = require('../models/User');

// Register & Login
router.post('/register', registerUser);
router.post('/login', loginUser);

// ✅ NEW: Update Profile Image Route
router.put('/update-profile-image', protect, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Update User in DB
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: req.file.path }, // Save Cloudinary URL
      { new: true } // Return the updated document
    ).select('-password'); // Don't return password

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;