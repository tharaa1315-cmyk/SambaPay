import express from 'express';
import { getContracts, getContract, createContract } from '../controllers/employeeController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('contracts', ['view', 'view_own']), getContracts);
router.get('/:id', auth, rbac('contracts', ['view', 'view_own']), getContract);
router.post('/', auth, rbac('contracts', 'create'), createContract);

export default router;
