import express from 'express';
import auth from '../middleware/auth.js';
import {
  searchOrganizations,
  getMyOrganization,
  createOrganization,
  requestToJoin,
  getJoinRequests,
  reviewJoinRequest
} from '../controllers/organizationController.js';

const router = express.Router();

router.get('/', auth, searchOrganizations);
router.get('/me', auth, getMyOrganization);
router.post('/', auth, createOrganization);
router.post('/join-requests', auth, requestToJoin);
router.get('/join-requests', auth, getJoinRequests);
router.put('/join-requests/:id', auth, reviewJoinRequest);

export default router;
