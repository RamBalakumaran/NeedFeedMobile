const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const foodRoutes = require('./routes/foodRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const Message = require('./models/Message');
const Food = require('./models/Food');
const Request = require('./models/Request');
const User = require('./models/User');
const { notifyUsers } = require('./utils/notifications');

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Checking DB URI:', process.env.MONGO_URI ? 'FOUND' : 'NOT FOUND');

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const onlineUserIds = new Map();
app.set('socketio', io);
app.set('onlineUserIds', onlineUserIds);

app.use(express.json());
app.use(cors());

require('./jobs/scheduler');

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'needfeed-backend' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.use('/api/food', foodRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

console.log('Food update routes active: PUT/PATCH/POST /api/food/my/:id');

const CHAT_MESSAGE_TYPES = new Set(['text', 'gif', 'image', 'file', 'location']);

const normalizeReplyTo = (replyTo) => {
  if (!replyTo?.messageId) return undefined;

  return {
    messageId: replyTo.messageId,
    senderId: replyTo.senderId,
    senderName: replyTo.senderName || '',
    text: replyTo.text || '',
    messageType: CHAT_MESSAGE_TYPES.has(replyTo.messageType) ? replyTo.messageType : 'text',
    gifUrl: replyTo.gifUrl || '',
  };
};

const normalizeLocation = (location) => {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    address: location?.address || '',
    label: location?.label || '',
  };
};

const buildChatNotificationBody = ({ senderName, messageType, text }) => {
  const safeText = String(text || '').trim();

  if (safeText) {
    return `${senderName}: ${safeText}`;
  }

  if (messageType === 'gif') return `${senderName}: Sent a GIF`;
  if (messageType === 'image') return `${senderName}: Sent a photo`;
  if (messageType === 'file') return `${senderName}: Sent a file`;
  if (messageType === 'location') return `${senderName}: Shared a location`;
  return `${senderName}: Sent a message`;
};

const getChatNotificationCopy = (senderRole) => (
  senderRole === 'ngo'
    ? {
        title: 'New Message from NGO',
        body: 'You received a new message about your donation',
      }
    : {
        title: 'New Message from Donor',
        body: 'You received a new reply regarding the donation',
      }
);

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  const registerOnlineUser = (userId) => {
    const normalizedUserId = String(userId || '');
    if (!normalizedUserId) return;

    const currentUserId = socket.data.userId ? String(socket.data.userId) : '';
    if (currentUserId && currentUserId !== normalizedUserId) {
      const previousSockets = onlineUserIds.get(currentUserId);
      if (previousSockets) {
        previousSockets.delete(socket.id);
        if (!previousSockets.size) {
          onlineUserIds.delete(currentUserId);
        }
      }
    }

    const socketsForUser = onlineUserIds.get(normalizedUserId) || new Set();
    socketsForUser.add(socket.id);
    onlineUserIds.set(normalizedUserId, socketsForUser);
    socket.data.userId = normalizedUserId;
  };

  const unregisterOnlineUser = () => {
    const normalizedUserId = socket.data.userId ? String(socket.data.userId) : '';
    if (!normalizedUserId) return;

    const socketsForUser = onlineUserIds.get(normalizedUserId);
    if (!socketsForUser) return;

    socketsForUser.delete(socket.id);
    if (!socketsForUser.size) {
      onlineUserIds.delete(normalizedUserId);
    }
  };

  socket.on('registerUser', ({ userId }) => {
    if (userId) {
      registerOnlineUser(userId);
      socket.join(`user:${userId}`);
    }
  });

  socket.on('joinChat', ({ requestId }) => {
    if (requestId) {
      socket.join(requestId);
      console.log('Room Joined:', requestId);
    }
  });

  socket.on('sendMessage', async (data, ack) => {
    const {
      requestId,
      senderId,
      text,
      messageType = 'text',
      gifUrl = '',
      attachment,
      location,
      replyTo,
      clientMessageId,
    } = data || {};

    const safeText = (text || '').trim();
    const normalizedLocation = normalizeLocation(location);

    if (!senderId || senderId === 'undefined' || !requestId) return;
    if (messageType === 'text' && !safeText) return;
    if (messageType === 'gif' && !gifUrl) return;
    if (messageType === 'location' && !normalizedLocation) return;

    try {
      const food = await Food.findById(requestId)
        .populate('donor', 'name')
        .populate('requestedBy', 'name')
        .populate('assignedVolunteer', 'name');
      const requestDoc = await Request.findOne({ donation: requestId }).select('chatStatus');

      if (!food || !food.requestedBy || !requestDoc) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: 'Request not found.' });
        }
        return;
      }

      if (food.status === 'Expired') {
        socket.emit('error_message', 'Food expired. Chat closed.');
        if (typeof ack === 'function') {
          ack({ ok: false, message: 'Food expired. Chat closed.' });
        }
        return;
      }

      if (requestDoc?.chatStatus === 'terminated') {
        if (typeof ack === 'function') {
          ack({ ok: false, message: 'This chat was terminated. New messages are disabled.' });
        }
        return;
      }

      const sender = await User.findById(senderId).select('name role profileImage');
      if (!sender) return;

      const donorId = String(food?.donor?._id || food?.donor || '');
      const ngoId = String(food?.requestedBy?._id || food?.requestedBy || '');
      const allowedSenderIds = new Set([donorId, ngoId].filter(Boolean));

      if (!allowedSenderIds.has(String(senderId))) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: 'Only the donor and NGO can use this chat.' });
        }
        return;
      }

      const newMessage = new Message({
        requestId,
        senderId,
        text: safeText,
        messageType,
        gifUrl,
        attachment: attachment?.url
          ? {
              url: attachment.url,
              publicId: attachment.publicId || '',
              fileName: attachment.fileName || '',
              mimeType: attachment.mimeType || '',
              fileSize: Number(attachment.fileSize || 0),
              resourceType: attachment.resourceType || '',
              width: Number(attachment.width || 0),
              height: Number(attachment.height || 0),
            }
          : undefined,
        location: normalizedLocation || undefined,
        replyTo: normalizeReplyTo(replyTo),
        timestamp: new Date(),
      });

      await newMessage.save();
      await newMessage.populate('senderId', 'name role profileImage');

      const payload = newMessage.toObject();
      if (clientMessageId) {
        payload.clientMessageId = clientMessageId;
      }

      if (typeof ack === 'function') {
        ack({ ok: true, message: payload });
      }

      socket.to(requestId).emit('newMessage', payload);

      const recipientIds = sender.role === 'ngo'
        ? [food?.donor?._id || food?.donor]
        : sender.role === 'donor'
          ? [food?.requestedBy?._id || food?.requestedBy]
          : [];
      const chatNotificationCopy = getChatNotificationCopy(sender.role);

      await notifyUsers({
        io,
        userIds: recipientIds,
        type: 'chat_message',
        title: chatNotificationCopy.title,
        body: chatNotificationCopy.body,
        data: {
          screen: 'Chat',
          requestId: String(requestId),
          name: sender.name,
          status: food?.status || 'Active',
          preview: buildChatNotificationBody({
            senderName: sender.name,
            messageType,
            text: safeText,
          }),
        },
      });
    } catch (error) {
      console.error('Socket Error:', error.message);
      if (typeof ack === 'function') {
        ack({ ok: false, message: error.message });
      }
    }
  });

  socket.on('disconnect', () => {
    unregisterOnlineUser();
    console.log('User Disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
