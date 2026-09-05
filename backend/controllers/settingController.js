import Setting from '../models/Setting.js';
import { logAudit } from '../utils/audit.js';

export const getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    const role = req.user.role;

    if (category) {
      if (!hasAccess(role, category, 'view')) {
        return res.status(403).json({ message: 'You do not have permission to view these settings' });
      }
      query.category = category;
    } else {
      if (role !== 'ADMIN') {
        const allowedCategories = [];
        if (role === 'HR_MANAGER') allowedCategories.push('hr', 'company');
        if (role === 'HR_PAYROLL_USER' || role === 'HR_PAYROLL_MANAGER') allowedCategories.push('payroll');
        if (allowedCategories.length === 0) return res.status(403).json({ message: 'No permissions' });
        query.category = { $in: allowedCategories };
      }
    }

    const settings = await Setting.find(query);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { category, key, value, type } = req.body;
    const role = req.user.role;

    if (!hasAccess(role, category)) {
      return res.status(403).json({ message: 'You do not have permission to update these settings' });
    }

    const setting = await Setting.findOneAndUpdate(
      { category, key },
      { value, type: type || 'text' },
      { new: true, upsert: true }
    );

    await logAudit({
      user: req.user,
      action: `Updated setting ${category}.${key}`,
      module: 'settings',
      newValues: { category, key, value }
    });

    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const { category, key } = req.params;
    const role = req.user.role;

    if (!hasAccess(role, category)) {
      return res.status(403).json({ message: 'You do not have permission to view this setting' });
    }

    const setting = await Setting.findOne({ category, key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

const hasAccess = (role, category) => {
  if (role === 'ADMIN') return true;
  if (role === 'HR_MANAGER' && (category === 'hr' || category === 'company')) {
    return true;
  }
  if ((role === 'HR_PAYROLL_USER' || role === 'HR_PAYROLL_MANAGER') && category === 'payroll') {
    return true;
  }
  return false;
};
