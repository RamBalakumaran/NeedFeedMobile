const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sanitizePublicId = (value = '') => (
  String(value)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const safeName = sanitizePublicId(file.originalname || `chat-${Date.now()}`) || `chat-${Date.now()}`;

    return {
      folder: 'needfeed_chat',
      resource_type: 'auto',
      public_id: `chat-${Date.now()}-${safeName}`,
    };
  },
});

const chatUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = chatUpload;
