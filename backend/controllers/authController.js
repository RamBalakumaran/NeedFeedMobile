const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { 
        name, email, password, role, phone, address, city, 
        latitude, longitude // Destructure lat/long from req.body
    } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the User instance
    const newUser = new User({ 
        ...req.body, 
        password: hashedPassword,
        // ✅ MAP GPS COORDINATES CORRECTLY
        location: {
            type: 'Point',
            coordinates: [
                parseFloat(longitude) || 0, // Longitude First
                parseFloat(latitude) || 0   // Latitude Second
            ]
        }
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};