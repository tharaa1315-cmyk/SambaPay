import express from 'express';
import { getNotifications, createNotification, markNotificationAsRead, markAllNotificationsAsRead } from '../controllers/notificationController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getNotifications);
router.post('/', auth, createNotification);
router.put('/read-all', auth, markAllNotificationsAsRead);
router.put('/:id/read', auth, markNotificationAsRead);

export default router;
