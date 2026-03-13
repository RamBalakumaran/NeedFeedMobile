const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');

// Get chat history for a specific request
router.get('/history/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const messages = await Message.find({ requestId })
      .populate('senderId', 'name')
      .sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error("Chat History Error:", error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

module.exports = router;
