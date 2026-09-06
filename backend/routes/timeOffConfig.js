import express from 'express';
import {
  listTimeOffTypes,
  createTimeOffType,
  updateTimeOffType,
  listAllocations,
  createAllocation,
  approveAllocation
} from '../controllers/timeOffConfigController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/types', auth, listTimeOffTypes);
router.post('/types', auth, createTimeOffType);
router.put('/types/:id', auth, updateTimeOffType);
router.get('/allocations', auth, listAllocations);
router.post('/allocations', auth, createAllocation);
router.put('/allocations/:id/approve', auth, approveAllocation);

export default router;
