const mongoose = require('mongoose');

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

const requestSchema = new mongoose.Schema({
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit', 'Completed', 'Rejected', 'Expired', 'Cancelled'],
    default: 'Pending'
  },
  workflowStatus: {
    type: String,
    enum: ['requested', 'accepted', 'rejected', 'volunteer_assigned', 'pickup_started', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'expired'],
    default: 'requested',
  },
  statusHistory: {
    type: [statusHistoryEntrySchema],
    default: [],
  },
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  chatStatus: {
    type: String,
    enum: ['active', 'terminated'],
    default: 'active',
  },
  chatTerminatedAt: { type: Date, default: null },
  chatTerminatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  chatTerminatedByRole: { type: String, default: '' },
  chatTerminatedByName: { type: String, default: '' },
  requestTimestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
