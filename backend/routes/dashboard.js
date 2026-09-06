import express from 'express';
import { getStats } from '../controllers/dashboardController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', auth, getStats);

export default router;
