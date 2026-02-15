const Food = require('../models/Food');
const User = require('../models/User');
const Request = require('../models/Request');

// 1. DONATE FOOD
exports.donateFood = async (req, res) => {
  try {
    const { title, quantity, description, foodType, category, storageInstruction, latitude, longitude, address } = req.body;
    const prepTime = req.body.preparationTime ? new Date(req.body.preparationTime) : new Date();

    let hoursToAdd = (category === 'Raw') ? 168 : (category === 'Bakery' ? 24 : 4);
    const expiryTime = new Date(prepTime);
    expiryTime.setHours(expiryTime.getHours() + hoursToAdd);

    const newFood = new Food({
      title, quantity, description, foodType, category, storageInstruction,
      preparationTime: prepTime, expiryTime,
      imageUrl: req.file.path,
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      address, donor: req.user.id
    });

    await newFood.save();
    res.status(201).json({ success: true, food: newFood });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. GET AVAILABLE FOOD (For NGO Discovery)
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
      if (!food) return res.status(404).json({ message: 'Food not found' });
      if (food.status !== 'Available') return res.status(400).json({ message: 'Already requested' });
  
      food.status = 'Pending';
      food.requestedBy = req.user.id;
      await food.save();
      res.json(food);
    } catch (e) { res.status(500).json({ message: 'Server Error' }); }
};

// 4. GET NGO'S CLAIMED FOOD (This fixes your empty page!)
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

// 5. GET DONOR'S INCOMING REQUESTS
exports.getDonorRequests = async (req, res) => {
    try {
      const foods = await Food.find({ 
        donor: req.user.id, 
        status: { $in: ['Pending', 'Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'PickedUp', 'Delivered'] } 
      })
      .populate('requestedBy', 'name phone organizationName')
      .sort({ createdAt: -1 });
      res.json(foods);
    } catch (e) { res.status(500).json({ message: 'Server Error' }); }
};

// 6. DONOR RESPOND (Accept/Reject)
exports.respondToNGORequest = async (req, res) => {
  const { action } = req.body;
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Not found" });

    if (action === 'reject') {
      food.status = 'Available';
      food.requestedBy = null;
      await food.save();
      return res.json({ message: "Rejected" });
    }

    food.status = 'FindingVolunteer'; 
    await food.save();

    // Volunteer Search logic (TC_E01)
    const volunteers = await User.find({
      role: 'volunteer',
      isAvailable: true,
      location: { $near: { $geometry: food.location, $maxDistance: 5000 } }
    });

    if (volunteers.length === 0) {
      food.status = 'WaitingForVolunteer';
      await food.save();
    }

    res.json({ message: "Accepted", status: food.status });
  } catch (e) {
    res.status(500).json({ message: 'Error' });
  }
};