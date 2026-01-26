const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // === 👤 BASE USER (Essential) ===
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['donor', 'ngo', 'volunteer', 'admin'], 
    default: 'donor' 
  },
  profileImage: { type: String, default: "" }, // URL
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [Longitude, Latitude]
  },

  // === 🍱 DONOR SPECIFIC ===
  donorType: { 
    type: String, 
    enum: ['Individual', 'Restaurant', 'Event', 'Hotel'] 
  },
  donorFoodCategory: { 
    type: String, 
    enum: ['Veg', 'Non-Veg', 'Both'] 
  },
  availabilityTime: { type: String }, // e.g., "10 AM - 10 PM"

  // === 🏢 NGO / SHELTER SPECIFIC ===
  organizationName: { type: String },
  licenseNumber: { type: String },
  capacity: { type: Number }, // People/Meals count
  ngoAcceptedCategory: { 
    type: String, 
    enum: ['Veg', 'Non-Veg', 'Both'] 
  },

  // === 🚚 VOLUNTEER SPECIFIC ===
  preferredArea: { type: String }, // Locality name
  vehicleType: { type: String },   // Bike, Car, Van
  isAvailable: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

// Geo-indexing for "Nearby" searches
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);