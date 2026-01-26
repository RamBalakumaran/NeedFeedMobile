const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  // 1. Linking
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
  preparationTime: { type: Date, required: true }, // When was it cooked?
  expiryTime: { type: Date, required: true }, // Auto-calculated
  storageInstruction: { 
    type: String, 
    enum: ['Keep Hot', 'Refrigerate', 'Room Temperature'],
    default: 'Room Temperature'
  },
  
  // 5. Proof
  imageUrl: { type: String, required: true }, // Visual Proof
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  },
  address: { type: String }, // Text address for easy reading

  createdAt: { type: Date, default: Date.now }
});

foodSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Food', foodSchema);