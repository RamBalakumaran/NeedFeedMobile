const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  ngo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  donation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Food', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'], 
    default: 'Pending' 
  },
  requestTimestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);