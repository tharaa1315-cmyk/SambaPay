import User from '../models/User.js';
import { generateToken } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import jwt from 'jsonwebtoken';
import { normalizeRole } from '../middleware/rbac.js';
import { isStoreInstalled } from '../services/inMemoryStore.js';

const demoUsers = [
  { id: 'demo-admin', name: 'Admin User', email: 'admin@demo.hr', role: 'ADMIN', password: 'admin123' },
  { id: 'demo-sarah', name: 'Sarah Connor', email: 'sarah.connor@company.com', role: 'ADMIN', password: 'password123' },
  { id: 'demo-hr', name: 'Evan Wright', email: 'evan.wright@company.com', role: 'HR_MANAGER', password: 'password123' },
  { id: 'demo-payroll', name: 'Fiona Gallagher', email: 'fiona.gallagher@company.com', role: 'HR_PAYROLL_MANAGER', password: 'password123' },
  { id: 'demo-employee', name: 'Alice Smith', email: 'alice.smith@company.com', role: 'EMPLOYEE', password: 'password123' },
  { id: 'demo-employee2', name: 'Bob Jones', email: 'bob.jones@company.com', role: 'EMPLOYEE', password: 'password123' }
];

const fallbackUsers = [...demoUsers];

const publicUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  employeeId: user.employeeId || null,
  organizationId: user.organizationId || null
});

const isDatabaseConnected = () => User.db.readyState === 1;
const validRoles = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'];

const requireAdministrator = (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Only system administrators can manage user roles' });
    return false;
  }
  return true;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // With the database connected we use the real User collection. When it is
    // unreachable, the in-memory store provides the same model interface, and
    // the bundled demo accounts remain as a final fallback.
    if (isDatabaseConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is inactive' });
      }
      const token = generateToken(user._id, user.role, user.email, user.name, user.employeeId, user.organizationId);
      await logAudit({
        user: { id: user._id, name: user.name, role: user.role },
        action: 'Logged in',
        module: 'auth'
      });
      return res.json({ token, user: publicUser(user) });
    }

    let candidate = null;
    try {
      candidate = await User.findOne({ email: normalizedEmail });
    } catch {
      candidate = null;
    }
    const demo = fallbackUsers.find((user) => user.email === normalizedEmail);
    const isMatch = candidate
      ? await candidate.comparePassword(password)
      : Boolean(demo && demo.password === password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const userObj = candidate
      ? {
          id: String(candidate._id),
          name: candidate.name,
          email: candidate.email,
          role: normalizeRole(candidate.role),
          employeeId: candidate.employeeId || null,
          organizationId: candidate.organizationId || null
        }
      : publicUser(demo);
    const token = generateToken(userObj.id, userObj.role, userObj.email, userObj.name, userObj.employeeId, userObj.organizationId);
    return res.json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !password || password.length < 6) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 6 characters are required' });
    }

    try {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists with this email' });
      }

      // Force role to EMPLOYEE for public registration to prevent privilege escalation
      const user = await User.create({ name: name.trim(), email: normalizedEmail, password, role: 'EMPLOYEE' });
      const token = generateToken(user._id, user.role, user.email, user.name, user.employeeId, user.organizationId);

      await logAudit({
        user: { id: user._id, name: user.name, role: user.role },
        action: 'Registered',
        module: 'auth'
      });

      return res.status(201).json({ token, user: publicUser(user) });
    } catch (registerError) {
      // Last-resort fallback for the brief period before the in-memory store
      // is installed (or when no persistence layer of any kind is available).
      if (fallbackUsers.some((user) => user.email === normalizedEmail)) {
        return res.status(409).json({ message: 'User already exists with this email' });
      }
      const user = {
        id: `local-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'EMPLOYEE',
        employeeId: null,
        organizationId: null
      };
      fallbackUsers.push(user);

      const safeUser = publicUser(user);
      const token = generateToken(safeUser.id, safeUser.role, safeUser.email, safeUser.name, null, null);
      return res.status(201).json({ token, user: safeUser });
    }
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: isStoreInstalled() ? 'If a matching account exists, a reset link has been sent' : 'No user found with this email' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();

    await logAudit({
      user: { id: user._id, name: user.name, role: user.role },
      action: 'Requested password reset',
      module: 'auth'
    });

    // In a real application, email the token here. We just log it for dev purposes.
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'Password reset token sent to email' });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await logAudit({
      user: { id: user._id, name: user.name, role: user.role },
      action: 'Reset password',
      module: 'auth'
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired reset token' });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        employeeId: req.user.employeeId || null,
        organizationId: req.user.organizationId || null
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      organizationId: user.organizationId || null
    });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getUsers = async (req, res) => {
  if (!requireAdministrator(req, res)) return;

  try {
    const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpire').sort({ name: 1 });
    if (users && users.length > 0) {
      return res.json(users.map(publicUser));
    }
    res.json(fallbackUsers.map(publicUser));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const updateUserRole = async (req, res) => {
  if (!requireAdministrator(req, res)) return;

  const { role } = req.body;
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid user role' });
  }
  if (req.params.id === req.user.id && role !== 'ADMIN') {
    return res.status(400).json({ message: 'You cannot remove your own administrator role' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) {
      const fallbackUser = fallbackUsers.find((item) => item.id === req.params.id);
      if (!fallbackUser) return res.status(404).json({ message: 'User not found' });
      fallbackUser.role = role;
      return res.json(publicUser(fallbackUser));
    }
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
