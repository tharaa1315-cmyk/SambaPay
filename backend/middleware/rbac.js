const ROLES = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  HR_PAYROLL_MANAGER: 'HR_PAYROLL_MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

const ROLE_ALIASES = {
  SYSTEM_ADMINISTRATOR: ROLES.ADMIN,
  PAYROLL_MANAGER: ROLES.HR_PAYROLL_MANAGER
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const PERMISSIONS = {
  employees: {
    [ROLES.ADMIN]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_MANAGER]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_PAYROLL_USER]: ['view'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view'],
    [ROLES.EMPLOYEE]: ['view_own', 'edit_own']
  },
  contracts: {
    [ROLES.ADMIN]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_MANAGER]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_PAYROLL_USER]: ['view'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view'],
    [ROLES.EMPLOYEE]: ['view_own']
  },
  attendance: {
    [ROLES.ADMIN]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_MANAGER]: ['view', 'create', 'edit', 'delete'],
    [ROLES.HR_PAYROLL_USER]: ['view'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view'],
    [ROLES.EMPLOYEE]: ['view_own', 'create_own', 'edit_own']
  },
  leave: {
    [ROLES.ADMIN]: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'cancel'],
    [ROLES.HR_MANAGER]: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'cancel'],
    [ROLES.HR_PAYROLL_USER]: ['view'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view'],
    [ROLES.EMPLOYEE]: ['view_own', 'create_own']
  },
  payroll: {
    [ROLES.ADMIN]: ['view', 'create', 'edit', 'delete', 'approve', 'process'],
    [ROLES.HR_MANAGER]: ['view'],
    [ROLES.HR_PAYROLL_USER]: ['view', 'create', 'edit'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view', 'create', 'edit', 'delete', 'approve', 'process'],
    [ROLES.EMPLOYEE]: ['view_own']
  },
  payslips: {
    [ROLES.ADMIN]: ['view', 'download', 'view_own', 'download_own'],
    [ROLES.HR_MANAGER]: ['view', 'download'],
    [ROLES.HR_PAYROLL_USER]: ['view', 'download'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view', 'download'],
    [ROLES.EMPLOYEE]: ['view_own', 'download_own']
  },
  reports: {
    [ROLES.ADMIN]: ['view', 'view_hr', 'view_payroll', 'view_limited'],
    [ROLES.HR_MANAGER]: ['view', 'view_hr'],
    [ROLES.HR_PAYROLL_USER]: ['view', 'view_payroll'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view', 'view_payroll'],
    [ROLES.EMPLOYEE]: ['view_limited']
  },
  settings: {
    [ROLES.ADMIN]: ['view', 'edit', 'delete'],
    [ROLES.HR_MANAGER]: ['view_hr', 'edit_hr'],
    [ROLES.HR_PAYROLL_USER]: ['view_payroll'],
    [ROLES.HR_PAYROLL_MANAGER]: ['view_payroll', 'edit_payroll'],
    [ROLES.EMPLOYEE]: []
  },
  auditLogs: {
    [ROLES.ADMIN]: ['view'],
    [ROLES.HR_MANAGER]: [],
    [ROLES.HR_PAYROLL_USER]: [],
    [ROLES.HR_PAYROLL_MANAGER]: [],
    [ROLES.EMPLOYEE]: []
  }
};

const hasPermission = (userRole, module, action) => {
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;

  const rolePerms = modulePerms[userRole];
  if (!rolePerms) return false;

  return rolePerms.includes(action);
};

const rbac = (module, allowedActions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);

    // Check if user has ANY of the allowed actions
    const actions = Array.isArray(allowedActions) ? allowedActions : [allowedActions];
    const isAllowed = actions.some(action => hasPermission(userRole, module, action));

    if (isAllowed) {
      next();
    } else {
      res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
  };
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!allowedRoles.map(normalizeRole).includes(normalizeRole(req.user.role))) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }

  next();
};

export { ROLES, normalizeRole, hasPermission, rbac, requireRole, PERMISSIONS };
