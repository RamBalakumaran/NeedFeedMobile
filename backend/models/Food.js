const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  // 1. Linking - Who posted this?
  donor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // 2. Basic Info
  title: { type: String, required: true }, // e.g. "Rice & Sambar"
  quantity: { type: String, required: true }, // e.g. "5 kg"
  description: { type: String }, // Ingredients / Allergens

  // 3. Essential Classifications
  foodType: { 
    type: String, 
    enum: ['Veg', 'Non-Veg', 'Vegan'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['Cooked', 'Raw', 'Bakery', 'Packed'], 
    required: true 
  },

  // 4. Safety & Quality
  preparationTime: { type: Date, required: true }, 
  expiryTime: { type: Date, required: true }, 
  storageInstruction: { 
    type: String, 
    enum: ['Keep Hot', 'Refrigerate', 'Room Temperature'],
    default: 'Room Temperature'
  },
  
  // 5. Proof & Location
  imageUrl: { type: String, required: true }, 
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  },
  address: { type: String }, // Human-readable address

  // 6. 🚀 NEW: WORKFLOW TRACKING
  // This manages the lifecycle: Available -> Pending (NGO Requests) -> Accepted (Donor Approves) -> PickedUp -> Delivered
  status: { 
    type: String, 
    enum: ['Available', 'Pending', 'Accepted', 'PickedUp', 'Delivered', 'Expired', 'Cancelled'], 
    default: 'Available' 
  },
  
  // Who requested the food? (NGO)
  requestedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  
  // Who is delivering it? (Volunteer)
  assignedVolunteer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },

  createdAt: { type: Date, default: Date.now }
});

// Geo-spatial index for "Find Food Near Me"
foodSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Food', foodSchema);