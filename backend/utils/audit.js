import AuditLog from '../models/AuditLog.js';

const logAudit = async ({ user, action, module, oldValues = null, newValues = null, resourceId = null }) => {
  try {
    if (oldValues && typeof oldValues.toJSON === 'function') oldValues = oldValues.toJSON();
    if (newValues && typeof newValues.toJSON === 'function') newValues = newValues.toJSON();

    if (oldValues && newValues && JSON.stringify(oldValues) === JSON.stringify(newValues)) {
      return; // Prevent duplicate/empty updates
    }

    const derivedResourceId = resourceId || newValues?._id || newValues?.id || oldValues?._id || oldValues?.id || null;

    await AuditLog.create({
      user: user?.id || user?._id || null,
      userName: user?.name || 'System',
      userRole: user?.role || 'Unknown',
      action,
      module,
      oldValues,
      newValues,
      resourceId: derivedResourceId
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

export { logAudit };
