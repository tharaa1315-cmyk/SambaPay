import express from 'express';
import {
  listSalaryRules,
  createSalaryRule,
  updateSalaryRule,
  listSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure
} from '../controllers/salaryController.js';
import auth from '../middleware/auth.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();
const payrollReaders = [ROLES.ADMIN, ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER];
const payrollManagers = [ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER];

router.get('/rules', auth, requireRole(...payrollReaders), listSalaryRules);
router.post('/rules', auth, requireRole(...payrollManagers), createSalaryRule);
router.put('/rules/:id', auth, requireRole(...payrollManagers), updateSalaryRule);
router.get('/structures', auth, requireRole(...payrollReaders), listSalaryStructures);
router.post('/structures', auth, requireRole(...payrollManagers), createSalaryStructure);
router.put('/structures/:id', auth, requireRole(...payrollManagers), updateSalaryStructure);

export default router;
