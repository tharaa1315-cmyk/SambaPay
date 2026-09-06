import express from 'express';
import { getSettings, getSetting, updateSetting } from '../controllers/settingController.js';
import auth from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', auth, rbac('settings', ['view', 'view_hr', 'view_payroll']), getSettings);
router.get('/:category/:key', auth, rbac('settings', ['view', 'view_hr', 'view_payroll']), getSetting);
router.put('/', auth, rbac('settings', ['edit', 'edit_hr', 'edit_payroll']), updateSetting);

export default router;
