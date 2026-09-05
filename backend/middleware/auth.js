import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { normalizeRole } from './rbac.js';
import { isStoreInstalled } from '../services/inMemoryStore.js';

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if ((User.db.readyState === 1 || isStoreInstalled()) && decoded.id && !String(decoded.id).startsWith('local-') && mongoose.isValidObjectId(decoded.id)) {
      const user = await User.findById(decoded.id).select('-password -resetPasswordToken -resetPasswordExpire');

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Account is inactive or no longer exists' });
      }

      req.user = {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        employeeId: user.employeeId || null,
        organizationId: user.organizationId || null
      };
    } else {
      req.user = { ...decoded, role: normalizeRole(decoded.role), organizationId: decoded.organizationId || null };
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;
