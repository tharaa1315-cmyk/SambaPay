import express from 'express';
import { getAttendance, createAttendance, updateAttendance } from '../controllers/attendanceController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('attendance', ['view', 'view_own']), getAttendance);
router.post('/', auth, rbac('attendance', ['create', 'create_own']), createAttendance);
router.put('/:id', auth, rbac('attendance', ['edit', 'edit_own']), updateAttendance);

export default router;
