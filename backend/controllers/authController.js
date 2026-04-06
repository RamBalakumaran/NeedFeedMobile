const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const REGISTRATION_ROLES = ['donor', 'ngo', 'volunteer'];

exports.registerUser = async (req, res) => {
  try {
    const {
      email, password, role, latitude, longitude,
    } = req.body;

    if (!REGISTRATION_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Only donor, NGO, and volunteer accounts can sign up.' });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      ...req.body,
      password: hashedPassword,
      location: {
        type: 'Point',
        coordinates: [
          parseFloat(longitude) || 0,
          parseFloat(latitude) || 0,
        ],
      },
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ token, user: userResponse });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    if (role && user.role !== role) {
      const roleLabel = user.role === 'ngo' ? 'NGO' : user.role.charAt(0).toUpperCase() + user.role.slice(1);
      return res.status(400).json({ message: `This account is registered as ${roleLabel}. Please use the correct login portal.` });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const nextEmail = req.body.email?.trim();
    if (nextEmail && nextEmail !== user.email) {
      const existingUser = await User.findOne({
        email: nextEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      user.email = nextEmail;
    }

    const baseFields = ['name', 'phone', 'address', 'city'];
    baseFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    if (user.role === 'donor') {
      ['donorType', 'donorFoodCategory', 'availabilityTime'].forEach((field) => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });
    }

    if (user.role === 'ngo') {
      ['organizationName', 'licenseNumber'].forEach((field) => {
        if (req.body[field] !== undefined) {
          user[field] = typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
        }
      });

      if (req.body.capacity !== undefined) {
        const parsedCapacity = Number(req.body.capacity);
        user.capacity = Number.isNaN(parsedCapacity) ? undefined : parsedCapacity;
      }
    }

    if (user.role === 'volunteer') {
      ['vehicleType', 'preferredArea'].forEach((field) => {
        if (req.body[field] !== undefined) {
          user[field] = typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
        }
      });
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
