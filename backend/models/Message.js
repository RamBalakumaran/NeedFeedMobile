const mongoose = require('mongoose');

const MESSAGE_TYPES = ['text', 'gif', 'image', 'file', 'location'];

const messageSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  messageType: {
    type: String,
    enum: MESSAGE_TYPES,
    default: 'text',
  },
  gifUrl: { type: String, default: '' },
  attachment: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    resourceType: { type: String, default: '' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: '' },
    label: { type: String, default: '' },
  },
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    text: { type: String, default: '' },
    messageType: {
      type: String,
      enum: MESSAGE_TYPES,
      default: 'text',
    },
    gifUrl: { type: String, default: '' },
  },
  isDeleted: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
