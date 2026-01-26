const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    // Destructure all possible fields
    const { 
      name, email, password, role, phone, address, city,
      // Donor Specific
      donorType, availabilityTime, 
      // Volunteer Specific
      vehicleType, 
      // NGO Specific
      organizationName, licenseNumber
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Encrypt Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User (Mongoose will ignore fields that don't match the schema, so we can pass everything)
    user = new User({
      name, email, password: hashedPassword, role, phone, address, city,
      donorType, availabilityTime,
      vehicleType,
      organizationName, licenseNumber,
      profileImage: "https://cdn-icons-png.flaticon.com/512/847/847969.png"
    });

    await user.save();

    // Create Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });

  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// 2. LOGIN USER
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check Email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Create Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};