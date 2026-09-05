import express from 'express';
import { getPayroll, getPayrollById, createPayroll, approvePayroll, processPayroll, calculatePayroll } from '../controllers/payrollController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('payroll', ['view', 'view_own']), getPayroll);
router.get('/:id', auth, rbac('payroll', ['view', 'view_own']), getPayrollById);
router.post('/', auth, rbac('payroll', 'create'), createPayroll);
router.put('/:id/approve', auth, rbac('payroll', 'approve'), approvePayroll);
router.post('/:id/process', auth, rbac('payroll', 'process'), processPayroll);
router.post('/:id/calculate', auth, rbac('payroll', 'edit'), calculatePayroll);

export default router;
