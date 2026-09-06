import express from 'express';
import { getEmployeeReport, getAttendanceReport, getPayrollReport, getLeaveReport, getSalaryReport, getDepartmentReport, getTaxReport } from '../controllers/reportController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/employees', auth, rbac('reports', ['view', 'view_limited', 'view_hr']), getEmployeeReport);
router.get('/attendance', auth, rbac('reports', ['view', 'view_limited', 'view_hr']), getAttendanceReport);
router.get('/payroll', auth, rbac('reports', ['view', 'view_payroll']), getPayrollReport);
router.get('/leave', auth, rbac('reports', ['view', 'view_limited', 'view_hr']), getLeaveReport);
router.get('/salary', auth, rbac('reports', ['view', 'view_hr', 'view_payroll']), getSalaryReport);
router.get('/department', auth, rbac('reports', ['view', 'view_hr']), getDepartmentReport);
router.get('/tax', auth, rbac('reports', ['view', 'view_payroll']), getTaxReport);

export default router;
