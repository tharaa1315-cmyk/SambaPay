import express from 'express';
import { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('employees', ['view', 'view_own']), getEmployees);
router.get('/:id', auth, rbac('employees', ['view', 'view_own']), getEmployee);
router.post('/', auth, rbac('employees', 'create'), createEmployee);
router.put('/:id', auth, rbac('employees', ['edit', 'edit_own']), updateEmployee);
router.delete('/:id', auth, rbac('employees', 'delete'), deleteEmployee);

export default router;
