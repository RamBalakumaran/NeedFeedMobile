const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const foodController = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');

// 1. NGO Discovery
router.get('/available', foodController.getAvailableFood);

// 2. Donate Food (Donor)
router.post('/donate', protect, upload.single('image'), foodController.donateFood);

// 3. NGO Actions
router.put('/request/:id', protect, foodController.requestFood);
router.get('/requests/ngo', protect, foodController.getNGORequests);

// 4. Donor Actions
router.get('/requests/donor', protect, foodController.getDonorRequests); // For Incoming Requests
router.get('/my/:donorId', foodController.getMyDonations);             // For Donation History
router.put('/respond/:id', protect, foodController.respondToNGORequest);

module.exports = router;