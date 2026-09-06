import express from 'express';
import { login, register, forgotPassword, resetPassword, getMe, getUsers, updateUserRole } from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, getMe);
router.get('/users', auth, requireRole(ROLES.ADMIN), getUsers);
router.put('/users/:id/role', auth, requireRole(ROLES.ADMIN), updateUserRole);

export default router;
