import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const canTargetOthers = (role) => ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(role);

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notifications = await Notification.find({ userId: String(userId) }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { message } = req.body;
    let targetUserId = req.body.userId || req.user.id || req.user._id;

    // Only administrators and HR managers can send to other users.
    if (canTargetOthers(req.user.role) && req.body.employeeId) {
      const employee = await Employee.findById(req.body.employeeId).select('_id');
      if (employee) {
        const target = await User.findOne({ employeeId: employee._id });
        if (target) targetUserId = String(target._id);
      }
    } else if (!canTargetOthers(req.user.role)) {
      targetUserId = req.user.id || req.user._id;
    }

    if (req.body.employeeId && canTargetOthers(req.user.role) && !targetUserId) {
      return res.status(404).json({ message: 'No user is linked to that employee yet' });
    }

    const notification = await Notification.create({ userId: String(targetUserId), message });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: String(userId) },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await Notification.updateMany(
      { userId: String(userId), read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount ?? result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
