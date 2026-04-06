const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const foodController = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');

// 1. NGO Discovery
router.get('/available', foodController.getAvailableFood);
router.get('/home/overview', protect, foodController.getHomeOverview);

// 2. Donate Food (Donor)
router.post('/donate', protect, upload.single('image'), foodController.donateFood);

// 3. NGO Actions
router.put('/request/:id', protect, foodController.requestFood);
router.get('/requests/ngo', protect, foodController.getNGORequests);

// 4. Donor Actions
router.get('/requests/donor', protect, foodController.getDonorRequests); // For Incoming Requests
router.get('/my/:donorId', foodController.getMyDonations);             // For Donation History
router.put('/my/:id', protect, upload.single('image'), foodController.updateDonation);
router.patch('/my/:id', protect, upload.single('image'), foodController.updateDonation);
router.post('/my/:id', protect, upload.single('image'), foodController.updateDonation);
router.put('/respond/:id', protect, foodController.respondToNGORequest);
router.put('/pickup/direct/:id', protect, foodController.directPickupRequest);
router.put('/cancel/:id', protect, foodController.cancelFoodRequest);
router.post('/feedback/:id', protect, foodController.submitDeliveryFeedback);

// 5. Volunteer Actions
router.get('/tasks/volunteer', protect, foodController.getVolunteerTasks);
router.put('/status/:id', protect, foodController.updateVolunteerTaskStatus);

module.exports = router;
