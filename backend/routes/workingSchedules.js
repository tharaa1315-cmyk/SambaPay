import express from 'express';
import { listWorkingSchedules, createWorkingSchedule, updateWorkingSchedule } from '../controllers/workingScheduleController.js';
import auth from '../middleware/auth.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();
const managers = [ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER];

router.get('/', auth, listWorkingSchedules);
router.post('/', auth, requireRole(...managers), createWorkingSchedule);
router.put('/:id', auth, requireRole(...managers), updateWorkingSchedule);

export default router;
