const mongoose = require('mongoose');

const feedbackEntrySchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 280 },
  submittedAt: { type: Date, default: null },
}, { _id: false });

const statusHistoryEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  label: { type: String, default: '' },
  note: { type: String, default: '' },
  actor: {
    id: { type: String, default: null },
    role: { type: String, default: '' },
    name: { type: String, default: '' },
  },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

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
    enum: ['Available', 'Pending', 'Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit', 'Delivered', 'Expired', 'Cancelled'],
    default: 'Available'
  },
  workflowStatus: {
    type: String,
    enum: ['donation_created', 'requested', 'accepted', 'rejected', 'volunteer_assigned', 'pickup_started', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'expired'],
    default: 'donation_created',
  },
  statusHistory: {
    type: [statusHistoryEntrySchema],
    default: [],
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

  deliveredAt: { type: Date, default: null },
  feedback: {
    donor: { type: feedbackEntrySchema, default: () => ({}) },
    ngo: { type: feedbackEntrySchema, default: () => ({}) },
    volunteer: { type: feedbackEntrySchema, default: () => ({}) },
  },

  createdAt: { type: Date, default: Date.now }
});

// Geo-spatial index for "Find Food Near Me"
foodSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Food', foodSchema);
