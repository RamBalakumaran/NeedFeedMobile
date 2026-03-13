const Food = require('../models/Food');
const User = require('../models/User');
const Request = require('../models/Request');

// 1. DONATE FOOD
exports.donateFood = async (req, res) => {
  try {
    const { title, quantity, description, foodType, category, storageInstruction, latitude, longitude, address } = req.body;
    const prepTime = new Date();
    let hoursToAdd = (category === 'Raw') ? 168 : (category === 'Bakery' ? 24 : 4);
    const expiryTime = new Date(prepTime);
    expiryTime.setHours(expiryTime.getHours() + hoursToAdd);

    const newFood = new Food({
      ...req.body,
      expiryTime,
      imageUrl: req.file ? req.file.path : "",
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      donor: req.user.id
    });
    await newFood.save();
    res.status(201).json({ success: true, food: newFood });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. GET AVAILABLE FOOD
exports.getAvailableFood = async (req, res) => {
  try {
    const foods = await Food.find({ expiryTime: { $gt: new Date() }, status: 'Available' })
      .populate('donor', 'name phone')
      .sort({ createdAt: -1 });
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. NGO REQUESTS FOOD
exports.requestFood = async (req, res) => {
    try {
      const food = await Food.findById(req.params.id);
      if (!food || food.status !== 'Available') return res.status(400).json({ message: 'Unavailable' });
      food.status = 'Pending';
      food.requestedBy = req.user.id;
      await food.save();
      res.json(food);
    } catch (e) { res.status(500).json({ message: 'Server Error' }); }
};

// 4. GET NGO REQUESTS
exports.getNGORequests = async (req, res) => {
    try {
      const foods = await Food.find({ requestedBy: req.user.id })
        .populate('donor', 'name phone address')
        .sort({ createdAt: -1 });
      res.json(foods);
    } catch (error) {
      res.status(500).json({ message: 'Server Error' });
    }
};

// 5. GET DONOR REQUESTS
exports.getDonorRequests = async (req, res) => {
    try {
      const foods = await Food.find({ donor: req.user.id, status: { $ne: 'Available' } })
      .populate('requestedBy', 'name phone organizationName')
      .sort({ createdAt: -1 });
      res.json(foods);
    } catch (e) { res.status(500).json({ message: 'Server Error' }); }
};

// 6. DONOR RESPOND (Accept/Reject)
// backend/controllers/foodController.js
exports.respondToNGORequest = async (req, res) => {
  const { action } = req.body;
  const foodId = req.params.id;

  try {
    const food = await Food.findById(foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });

    if (action === 'reject') {
      food.status = 'Available';
      food.requestedBy = null;
      await food.save();
      return res.json({ message: "Request Rejected" });
    }

    // --- DONOR ACCEPTS ---
    food.status = 'FindingVolunteer'; 
    await food.save();

    // 1. Search for Nearest Available Volunteers (5km)
    const volunteers = await User.find({
      role: 'volunteer',
      isAvailable: true,
      location: {
        $near: {
          $geometry: food.location,
          $maxDistance: 5000 
        }
      }
    });

    if (volunteers.length > 0) {
      // ✅ AUTO-ASSIGN LOGIC: Pick the nearest one (index 0)
      const selectedVolunteer = volunteers[0];

      food.assignedVolunteer = selectedVolunteer._id;
      food.status = 'Assigned'; // Change status immediately
      await food.save();

      // Update the Request record too
      await Request.findOneAndUpdate(
        { donation: foodId }, 
        { status: 'Assigned', volunteer: selectedVolunteer._id }
      );

      // TC_E02: Mark volunteer as busy so they don't get two orders
      selectedVolunteer.isAvailable = false;
      await selectedVolunteer.save();

      // 📢 REAL-TIME NOTIFICATION (Via Socket.io)
      // We will trigger this in server.js using an emit
      const io = req.app.get('socketio');
      io.emit('statusUpdate', { 
          foodId: food._id, 
          status: 'Assigned', 
          volunteerName: selectedVolunteer.name 
      });

      return res.json({ 
          message: `Volunteer ${selectedVolunteer.name} assigned!`, 
          status: 'Assigned',
          volunteer: selectedVolunteer
      });
    } else {
      // TC_E01: No volunteers found
      food.status = 'WaitingForVolunteer';
      await food.save();
      return res.json({ message: "No volunteers found nearby. NGO self-pickup enabled.", status: 'WaitingForVolunteer' });
    }

  } catch (e) {
      res.status(500).json({ message: 'Error', error: e.message });
  }
};

// 7. GET DONATION HISTORY (Fixes empty Donor History page)
exports.getMyDonations = async (req, res) => {
  try {
    const { donorId } = req.params;
    const foods = await Food.find({ donor: donorId }).sort({ createdAt: -1 });
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};