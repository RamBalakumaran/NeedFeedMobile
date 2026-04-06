const Notification = require('../models/Notification');
const User = require('../models/User');
const { getFirebaseMessaging } = require('../config/firebaseAdmin');

const FCM_BATCH_SIZE = 500;
const INVALID_FCM_TOKEN_ERRORS = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const normalizeUserIds = (userIds = [], excludeUserIds = []) => {
  const exclude = new Set(excludeUserIds.filter(Boolean).map((id) => String(id)));
  return [...new Set(
    userIds
      .filter(Boolean)
      .map((id) => String(id))
      .filter((id) => !exclude.has(id))
  )];
};

const chunkItems = (items = [], size = FCM_BATCH_SIZE) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const toFcmDataStringMap = (payload = {}) => Object.entries(payload).reduce((acc, [key, value]) => {
  if (value === undefined || value === null) {
    return acc;
  }

  acc[key] = typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value);

  return acc;
}, {});

const removeInvalidFcmTokens = async (tokens = []) => {
  const normalizedTokens = [...new Set(tokens.filter((token) => typeof token === 'string' && token.trim()))];
  if (!normalizedTokens.length) return;

  try {
    await User.updateMany(
      { fcmTokens: { $in: normalizedTokens } },
      { $pull: { fcmTokens: { $in: normalizedTokens } } }
    );
  } catch (error) {
    console.error('FCM token cleanup failed:', error.message);
  }
};

const sendFcmNotifications = async (messages) => {
  if (!messages.length) return;

  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  const invalidTokens = new Set();
  const messageBatches = chunkItems(messages, FCM_BATCH_SIZE);

  for (const batch of messageBatches) {
    try {
      const response = await messaging.sendEach(batch);

      response.responses.forEach((result, index) => {
        if (result.success) return;

        const errorCode = result.error?.code || '';
        const token = batch[index]?.token;
        console.error('FCM push send failed:', errorCode || result.error?.message || 'Unknown error');

        if (INVALID_FCM_TOKEN_ERRORS.has(errorCode) && token) {
          invalidTokens.add(token);
        }
      });
    } catch (error) {
      console.error('FCM push error:', error.message);
    }
  }

  if (invalidTokens.size) {
    await removeInvalidFcmTokens([...invalidTokens]);
  }
};

const notifyUsers = async ({
  io,
  userIds = [],
  title,
  body,
  type,
  data = {},
  excludeUserIds = [],
}) => {
  const targets = normalizeUserIds(userIds, excludeUserIds);
  if (!targets.length) return [];

  const createdNotifications = await Notification.insertMany(
    targets.map((userId) => ({
      user: userId,
      title,
      body,
      type,
      data,
    }))
  );
  const notificationByUserId = new Map(
    createdNotifications.map((notification) => [String(notification.user), notification])
  );

  const users = await User.find({ _id: { $in: targets } }).select('fcmTokens');
  const pushMessages = [];

  createdNotifications.forEach((notification) => {
    io?.to(`user:${String(notification.user)}`).emit('notification:new', notification.toObject());
  });

  users.forEach((user) => {
    const notification = notificationByUserId.get(String(user._id));
    if (!notification) return;

    (user.fcmTokens || []).forEach((token) => {
      if (!token) return;

      pushMessages.push({
        token,
        notification: {
          title,
          body,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            sound: 'default',
          },
        },
        data: toFcmDataStringMap({
          notificationId: String(notification._id),
          type,
          ...data,
        }),
      });
    });
  });

  await sendFcmNotifications(pushMessages);
  return createdNotifications;
};

module.exports = {
  notifyUsers,
};
