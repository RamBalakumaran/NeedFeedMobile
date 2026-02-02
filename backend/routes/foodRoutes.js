const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const Food = require('../models/Food');
const User = require('../models/User');
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

router.put('/request/:id', protect, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    
    if (!food) return res.status(404).json({ message: 'Food not found' });
    if (food.status !== 'Available') return res.status(400).json({ message: 'Food already requested' });

    food.status = 'Pending';
    food.requestedBy = req.user.id; // Saves the NGO ID
    await food.save();
    
    res.json(food);
  } catch (e) { 
    console.error(e);
    res.status(500).json({ message: 'Server Error during request' }); 
  }
});



router.get('/requests/donor', protect, async (req, res) => {
  try {
    const foods = await Food.find({ 
      donor: req.user.id, 
      status: { $in: ['Pending', 'Accepted', 'PickedUp', 'Delivered'] } 
    })
    .populate('requestedBy', 'name email phone organizationName') // See who asked
    .populate('assignedVolunteer', 'name phone vehicleType') // See who is delivering
    .sort({ createdAt: -1 });
    
    res.json(foods);
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. DONOR RESPONDS (Accept / Reject)
router.put('/respond/:id', protect, async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });

    if (action === 'reject') {
      // Logic: Reset to Available so others can find it
      food.status = 'Available';
      food.requestedBy = null;
    } else if (action === 'accept') {
      // Logic: Lock it for that NGO
      food.status = 'Accepted';
      // (Optional: Here you could auto-assign a volunteer if you had geospatial logic)
    }
    
    await food.save();
    res.json(food);
  } catch (e) { 
    res.status(500).json({ message: 'Error responding' }); 
  }
});

// 3. CANCEL REQUEST (NGO)
router.put('/cancel/:id', protect, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    food.status = 'Available';
    food.requestedBy = null;
    food.assignedVolunteer = null;
    await food.save();
    res.json(food);
  } catch (e) { res.status(500).json({ message: 'Error cancelling' }); }
});

// 4. VOLUNTEER UPDATE STATUS (Pickup/Deliver)
router.put('/status/:id', protect, async (req, res) => {
  const { status } = req.body; // 'PickedUp' or 'Delivered'
  try {
    const food = await Food.findById(req.params.id);
    food.status = status;
    await food.save();
    res.json(food);
  } catch (e) { res.status(500).json({ message: 'Error updating status' }); }
});

// 5. GET REQUESTS FOR DONOR
router.get('/requests/donor', protect, async (req, res) => {
  const foods = await Food.find({ donor: req.user.id, status: { $in: ['Pending', 'Accepted', 'PickedUp', 'Delivered'] } })
    .populate('requestedBy', 'name phone email organizationName')
    .populate('assignedVolunteer', 'name phone vehicleType')
    .sort({ createdAt: -1 });
  res.json(foods);
});

// 6. GET REQUESTS FOR NGO
router.get('/requests/ngo', protect, async (req, res) => {
  const foods = await Food.find({ requestedBy: req.user.id })
    .populate('donor', 'name phone address')
    .populate('assignedVolunteer', 'name phone vehicleType')
    .sort({ createdAt: -1 });
  res.json(foods);
});

// 7. GET TASKS FOR VOLUNTEER
router.get('/tasks/volunteer', protect, async (req, res) => {
  // In real app, filter by req.user.id if explicitly assigned
  const foods = await Food.find({ 
    status: { $in: ['Accepted', 'PickedUp', 'Delivered'] },
    assignedVolunteer: { $ne: null } 
  })
    .populate('donor', 'name address')
    .populate('requestedBy', 'name address organizationName')
    .sort({ createdAt: -1 });
  res.json(foods);
});

module.exports = router;