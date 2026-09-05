import express from 'express';
import { getPayslips, getPayslip, downloadPayslip } from '../controllers/payslipController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('payslips', ['view', 'view_own']), getPayslips);
router.get('/:id', auth, rbac('payslips', ['view', 'view_own']), getPayslip);
router.get('/:id/download', auth, rbac('payslips', ['download', 'download_own']), downloadPayslip);

export default router;
