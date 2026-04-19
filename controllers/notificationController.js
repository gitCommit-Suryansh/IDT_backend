const admin = require('../services/adminFirebase');

// POST /api/notifications/send
exports.sendNotification = async (req, res) => {
  try {
    const { title, body, imageUrl } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'high_importance_channel',
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      topic: 'all-users',
    };

    const response = await admin.messaging().send(message);

    console.log(`[FCM] Notification sent. Message ID: ${response}`);
    return res.status(200).json({
      success: true,
      message: 'Notification sent to all users.',
      messageId: response,
    });
  } catch (err) {
    console.error('[FCM] Send error:', err);
    return res.status(500).json({ message: 'Failed to send notification.', error: err.message });
  }
};
