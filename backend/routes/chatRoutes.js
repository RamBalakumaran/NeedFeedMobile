const express = require('express');

const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Food = require('../models/Food');
const Request = require('../models/Request');
const User = require('../models/User');
const chatUpload = require('../config/chatUpload');
const { notifyUsers } = require('../utils/notifications');

const CHAT_MESSAGE_TYPES = new Set(['text', 'gif', 'image', 'file', 'location']);

const serializeTerminatedBy = (requestDoc) => {
  if (!requestDoc?.chatTerminatedAt) {
    return null;
  }

  if (requestDoc.chatTerminatedBy && typeof requestDoc.chatTerminatedBy === 'object') {
    return {
      _id: requestDoc.chatTerminatedBy._id,
      name: requestDoc.chatTerminatedByName
        || requestDoc.chatTerminatedBy.organizationName
        || requestDoc.chatTerminatedBy.name
        || 'User',
      role: requestDoc.chatTerminatedByRole || requestDoc.chatTerminatedBy.role || '',
    };
  }

  if (!requestDoc.chatTerminatedByName) {
    return null;
  }

  return {
    _id: requestDoc.chatTerminatedBy || null,
    name: requestDoc.chatTerminatedByName,
    role: requestDoc.chatTerminatedByRole || '',
  };
};

const buildChatPayload = ({ requestDoc, food }) => ({
  _id: requestDoc?._id || null,
  status: requestDoc?.status || food?.status || 'Pending',
  foodStatus: food?.status || 'Pending',
  workflowStatus: food?.workflowStatus || requestDoc?.workflowStatus || '',
  statusHistory: food?.statusHistory || requestDoc?.statusHistory || [],
  chatStatus: requestDoc?.chatStatus || 'active',
  chatTerminatedAt: requestDoc?.chatTerminatedAt || null,
  chatTerminatedBy: serializeTerminatedBy(requestDoc),
  donor: food?.donor || null,
  requestedBy: food?.requestedBy || null,
  assignedVolunteer: food?.assignedVolunteer || null,
});

const loadRequestContext = async (requestId) => {
  const food = await Food.findById(requestId)
    .populate('donor', 'name organizationName role phone address')
    .populate('requestedBy', 'name organizationName role phone address')
    .populate('assignedVolunteer', 'name role phone address vehicleType');

  if (!food) {
    return { food: null, requestDoc: null };
  }

  const requestDoc = await Request.findOne({ donation: requestId })
    .populate('chatTerminatedBy', 'name organizationName role');

  return { food, requestDoc };
};

const isAllowedParticipant = (food, userId) => {
  const participantIds = [
    food?.donor?._id || food?.donor,
    food?.requestedBy?._id || food?.requestedBy,
    food?.assignedVolunteer?._id || food?.assignedVolunteer,
  ]
    .filter(Boolean)
    .map((id) => String(id));

  return participantIds.includes(String(userId));
};

const isAllowedChatSender = (food, userId) => {
  const participantIds = [
    food?.donor?._id || food?.donor,
    food?.requestedBy?._id || food?.requestedBy,
  ]
    .filter(Boolean)
    .map((id) => String(id));

  return participantIds.includes(String(userId));
};

const parseReplyTo = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

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

const getChatRecipients = (food, senderRole) => (
  senderRole === 'ngo'
    ? [food?.donor?._id || food?.donor]
    : senderRole === 'donor'
      ? [food?.requestedBy?._id || food?.requestedBy]
      : []
);

const emitChatEvent = (io, requestId, eventName, payload) => {
  io?.to(String(requestId)).emit(eventName, payload);
};

const createPopulatedMessagePayload = async (message) => {
  await message.populate('senderId', 'name role profileImage');
  return message.toObject();
};

const ensureWritableChat = ({ food, requestDoc, res }) => {
  if (!food || !food.requestedBy || !requestDoc) {
    res.status(404).json({ message: 'Request not found' });
    return false;
  }

  if (food.status === 'Expired') {
    res.status(400).json({ message: 'Food expired. Chat closed.' });
    return false;
  }

  if (requestDoc.chatStatus === 'terminated') {
    res.status(400).json({ message: 'This chat was terminated. New messages are disabled.' });
    return false;
  }

  return true;
};

router.get('/history/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { food, requestDoc } = await loadRequestContext(requestId);

    if (!food) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!isAllowedParticipant(food, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    const messages = await Message.find({ requestId })
      .populate('senderId', 'name role profileImage')
      .sort({ timestamp: 1 });

    res.json({
      messages,
      request: buildChatPayload({ requestDoc, food }),
    });
  } catch (error) {
    console.error('Chat History Error:', error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

router.post('/upload/:requestId', protect, chatUpload.single('attachment'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { food, requestDoc } = await loadRequestContext(requestId);

    if (!food) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!isAllowedChatSender(food, req.user.id)) {
      return res.status(403).json({ message: 'Only the donor and NGO can use this chat.' });
    }

    if (!ensureWritableChat({ food, requestDoc, res })) {
      return;
    }

    if (!req.file?.path) {
      return res.status(400).json({ message: 'Attachment upload failed.' });
    }

    const sender = await User.findById(req.user.id).select('name role profileImage');
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const safeText = String(req.body?.text || '').trim();
    const replyTo = normalizeReplyTo(parseReplyTo(req.body?.replyTo));
    const detectedType = (req.file.mimetype || '').startsWith('image/') ? 'image' : 'file';
    const requestedType = CHAT_MESSAGE_TYPES.has(req.body?.messageType) ? req.body.messageType : detectedType;
    const messageType = requestedType === 'image' || requestedType === 'file' ? requestedType : detectedType;

    const newMessage = new Message({
      requestId,
      senderId: req.user.id,
      text: safeText,
      messageType,
      attachment: {
        url: req.file.path || req.file.secure_url || '',
        publicId: req.file.filename || req.file.public_id || '',
        fileName: req.file.originalname || '',
        mimeType: req.file.mimetype || '',
        fileSize: Number(req.file.size || 0),
        resourceType: req.file.resource_type || (messageType === 'image' ? 'image' : 'raw'),
        width: Number(req.file.width || 0),
        height: Number(req.file.height || 0),
      },
      replyTo,
      timestamp: new Date(),
    });

    await newMessage.save();
    const payload = await createPopulatedMessagePayload(newMessage);
    const io = req.app.get('socketio');
    const chatNotificationCopy = getChatNotificationCopy(sender.role);

    emitChatEvent(io, requestId, 'newMessage', payload);

    await notifyUsers({
      io,
      userIds: getChatRecipients(food, sender.role),
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

    res.status(201).json({ success: true, message: payload });
  } catch (error) {
    console.error('Chat upload error:', error);
    res.status(500).json({ message: 'Failed to upload chat attachment' });
  }
});

router.put('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const { food, requestDoc } = await loadRequestContext(message.requestId);
    if (!food) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!isAllowedChatSender(food, req.user.id) || String(message.senderId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the sender can edit this message.' });
    }

    if (!ensureWritableChat({ food, requestDoc, res })) {
      return;
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Deleted messages cannot be edited.' });
    }

    if (message.messageType === 'gif') {
      return res.status(400).json({ message: 'GIF messages cannot be edited.' });
    }

    const nextText = String(req.body?.text || '').trim();
    if (message.messageType === 'text' && !nextText) {
      return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    message.text = nextText;
    message.editedAt = new Date();
    await message.save();

    const payload = await createPopulatedMessagePayload(message);
    const io = req.app.get('socketio');
    emitChatEvent(io, message.requestId, 'message:updated', payload);

    res.json({ success: true, message: payload });
  } catch (error) {
    console.error('Chat edit error:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
});

router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const { food, requestDoc } = await loadRequestContext(message.requestId);
    if (!food) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!isAllowedChatSender(food, req.user.id) || String(message.senderId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the sender can delete this message.' });
    }

    if (!ensureWritableChat({ food, requestDoc, res })) {
      return;
    }

    if (!message.isDeleted) {
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.text = '';
      message.gifUrl = '';
      message.attachment = undefined;
      message.location = undefined;
      message.editedAt = null;
      await message.save();
    }

    const payload = await createPopulatedMessagePayload(message);
    const io = req.app.get('socketio');
    emitChatEvent(io, message.requestId, 'message:deleted', payload);

    res.json({ success: true, message: payload });
  } catch (error) {
    console.error('Chat delete error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

router.put('/terminate/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { food, requestDoc } = await loadRequestContext(requestId);

    if (!food || !requestDoc) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const actorId = String(req.user.id);
    const donorId = String(food.donor?._id || food.donor || '');
    const ngoId = String(food.requestedBy?._id || food.requestedBy || '');
    const isDonor = donorId === actorId;
    const isNgo = ngoId === actorId;

    if (!isDonor && !isNgo) {
      return res.status(403).json({ message: 'Only the donor or NGO can terminate this chat' });
    }

    if (requestDoc.chatStatus === 'terminated') {
      return res.json({
        success: true,
        request: buildChatPayload({ requestDoc, food }),
      });
    }

    const actorName = isNgo
      ? food.requestedBy?.organizationName || food.requestedBy?.name || 'NGO'
      : food.donor?.name || 'Donor';

    requestDoc.chatStatus = 'terminated';
    requestDoc.chatTerminatedAt = new Date();
    requestDoc.chatTerminatedBy = req.user.id;
    requestDoc.chatTerminatedByRole = req.user.role || '';
    requestDoc.chatTerminatedByName = actorName;
    await requestDoc.save();
    await requestDoc.populate('chatTerminatedBy', 'name organizationName role');

    const io = req.app.get('socketio');
    const terminatedPayload = {
      requestId: String(food._id),
      chatStatus: 'terminated',
      terminatedAt: requestDoc.chatTerminatedAt,
      terminatedBy: serializeTerminatedBy(requestDoc),
    };

    io?.to(String(food._id)).emit('chat:terminated', terminatedPayload);

    const counterpartId = isDonor ? ngoId : donorId;
    await notifyUsers({
      io,
      userIds: counterpartId ? [counterpartId] : [],
      type: 'chat_terminated',
      title: 'Chat terminated',
      body: `${actorName} ended the chat for ${food.title}.`,
      data: {
        requestId: String(food._id),
        foodId: String(food._id),
        status: food.status || 'Active',
      },
    });

    res.json({
      success: true,
      request: buildChatPayload({ requestDoc, food }),
    });
  } catch (error) {
    console.error('Chat terminate error:', error);
    res.status(500).json({ message: 'Failed to terminate chat' });
  }
});

module.exports = router;
