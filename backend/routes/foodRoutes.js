const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const Food = require('../models/Food');
const { protect } = require('../middleware/authMiddleware'); 

// POST /api/food/donate (Uploads Image + Data)
router.post('/donate',protect, upload.single('image'), async (req, res) => {
  try {
    const { 
      title, quantity, description, 
      foodType, category, storageInstruction, 
      latitude, longitude, address 
    } = req.body;

    // 1. Parse Preparation Time (Assume user sends ISO string or we use Now)
    const prepTime = req.body.preparationTime ? new Date(req.body.preparationTime) : new Date();

    // 2. Auto-Calculate Expiry Logic
    let hoursToAdd = 4; // Default safe time for cooked food
    
    if (category === 'Raw') hoursToAdd = 168; // 1 Week
    else if (category === 'Bakery') hoursToAdd = 24; // 1 Day
    else if (category === 'Packed') hoursToAdd = 720; // 1 Month
    else if (category === 'Cooked') {
       // Cooked Food Logic
       hoursToAdd = (foodType === 'Non-Veg') ? 3 : 5; // Non-veg spoils faster
       if (storageInstruction === 'Refrigerate') hoursToAdd += 12; // Fridge extends life
    }

    const expiryTime = new Date(prepTime);
    expiryTime.setHours(expiryTime.getHours() + hoursToAdd);

    // 3. Create Food Entry
    const newFood = new Food({
      title,
      quantity,
      description,
      foodType,
      category,
      storageInstruction,
      preparationTime: prepTime,
      expiryTime,
      imageUrl: req.file.path,
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      address,
      donor: req.user.id // Assumes Auth Middleware is working, else use req.body.donorId
    });

    await newFood.save();
    res.status(201).json({ success: true, message: 'Food Donation Verified & Listed!', food: newFood });

  } catch (error) {
    console.error("Donation Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET /api/food/available (Fetch Food + Donor Name)
// GET /api/food/available
// Supports: ?search=biryani & ?type=Veg
router.get('/available', async (req, res) => {
  try {
    const { search, type } = req.query;

    // 1. Base Query: Not expired
    let query = { expiryTime: { $gt: new Date() } };

    // 2. Search Filter (Title or Description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }, // 'i' = case insensitive
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 3. Category Filter
    if (type && type !== 'All') {
      query.foodType = type; // e.g., 'Veg', 'Non-Veg'
    }

    const foods = await Food.find(query)
      .populate('donor', 'name phone') // Fetch donor details
      .sort({ createdAt: -1 });
    
    res.json(foods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/food/my/:donorId
router.get('/my/:donorId', async (req, res) => {
  try {
    const foods = await Food.find({ donor: req.params.donorId })
      .sort({ createdAt: -1 });
    res.json(foods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;