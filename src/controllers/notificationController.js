/**
 * notificationController.js — Read, mark, clear user notifications
 */
const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

const getNotifications = catchAsync(async (req, res) => {
  const { isRead, page = 1, limit = 20 } = req.query;
  const query = { user: req.user._id };
  if (isRead !== undefined) query.isRead = isRead === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  sendPaginated(res, 200, 'Notifications fetched.', notifications, {
    page: parseInt(page), limit: parseInt(limit), total, unreadCount,
  });
});

const markRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  sendSuccess(res, 200, 'Notification marked as read.', { notification });
});

const markAllRead = catchAsync(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  sendSuccess(res, 200, `${result.modifiedCount} notifications marked as read.`);
});

const deleteNotification = catchAsync(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.notificationId, user: req.user._id });
  sendSuccess(res, 200, 'Notification deleted.');
});

const clearAll = catchAsync(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id, isRead: true });
  sendSuccess(res, 200, 'All read notifications cleared.');
});

module.exports = { getNotifications, markRead, markAllRead, deleteNotification, clearAll };
