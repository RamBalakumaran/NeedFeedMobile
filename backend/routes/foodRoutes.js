const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const foodController = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');

// Discovery
router.get('/available', foodController.getAvailableFood);

// Create Donation
router.post('/donate', protect, upload.single('image'), foodController.donateFood);

// NGO Actions
router.put('/request/:id', protect, foodController.requestFood);
router.get('/requests/ngo', protect, foodController.getNGORequests); // Fix for your empty page

// Donor Actions
router.get('/requests/donor', protect, foodController.getDonorRequests);
router.put('/respond/:id', protect, foodController.respondToNGORequest);

module.exports = router;