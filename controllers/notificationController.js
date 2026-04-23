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

// POST /api/notifications/upload
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'No image provided.' });
    }

    // Multer-Cloudinary setup usually stores single files in req.file, or multiple in req.files
    const file = req.file || req.files[0];
    let imageUrl = file.path || file.location || file.secure_url || file.url;

    if (!imageUrl) {
      return res.status(500).json({ message: 'Failed to retrieve image URL from Cloudinary.' });
    }

    // Android FCM drops images if they are too large or take too long to download (common with PNGs).
    // Inject Cloudinary transformations to force conversion to optimized JPEG with max width 800px.
    if (imageUrl.includes("cloudinary.com")) {
      const parts = imageUrl.split("/upload/");
      if (parts.length === 2) {
        imageUrl = `${parts[0]}/upload/f_jpg,q_auto,w_800/${parts[1]}`;
      }
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Image uploaded successfully.', 
      imageUrl 
    });
  } catch (err) {
    console.error('uploadImage error:', err);
    return res.status(500).json({ message: 'Server error during upload.', error: err.message });
  }
};
