const notificationModel = require('../models/notificationModel');

async function getMyNotifications(req, res) {
  const notifications = await notificationModel.getUserNotifications(req.user.id);
  return res.json({ notifications });
}

async function markAsRead(req, res) {
  await notificationModel.markRead(req.params.id, req.user.id);
  return res.json({ message: 'Marked as read' });
}

module.exports = { getMyNotifications, markAsRead };
