import express from 'express';
import { getLeave, createLeave, approveLeave, rejectLeave, cancelLeave } from '../controllers/leaveController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('leave', ['view', 'view_own']), getLeave);
router.post('/', auth, rbac('leave', ['create', 'create_own']), createLeave);
router.put('/:id/approve', auth, rbac('leave', 'approve'), approveLeave);
router.put('/:id/reject', auth, rbac('leave', 'reject'), rejectLeave);
router.put('/:id/cancel', auth, rbac('leave', ['cancel', 'cancel_own']), cancelLeave);

export default router;
