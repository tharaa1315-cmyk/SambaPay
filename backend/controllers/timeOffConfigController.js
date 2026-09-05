import mongoose from 'mongoose';
import TimeOffType from '../models/TimeOffType.js';
import TimeOffAllocation from '../models/TimeOffAllocation.js';
import Employee from '../models/Employee.js';
import { logAudit } from '../utils/audit.js';

const isValidId = (value) => mongoose.isValidObjectId(value);
const hrRoles = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];
const canManage = (role) => hrRoles.includes(role);

export const listTimeOffTypes = async (req, res) => {
  try {
    const types = await TimeOffType.find().sort({ name: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createTimeOffType = async (req, res) => {
  try {
    if (!canManage(req.user.role)) return res.status(403).json({ message: 'You do not have permission to manage time-off types' });
    const type = await TimeOffType.create({
      name: req.body.name,
      code: req.body.code,
      unit: req.body.unit,
      allocationRequired: req.body.allocationRequired,
      approvalWorkflow: req.body.approvalWorkflow,
      payrollIntegration: req.body.payrollIntegration,
      active: req.body.active
    });
    await logAudit({ user: req.user, action: 'Created time-off type', module: 'leave', newValues: type });
    res.status(201).json(type);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'Time-off type code already exists' : err.message });
  }
};

export const updateTimeOffType = async (req, res) => {
  try {
    if (!canManage(req.user.role)) return res.status(403).json({ message: 'You do not have permission to manage time-off types' });
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid time-off type ID' });
    const oldType = await TimeOffType.findById(req.params.id);
    if (!oldType) return res.status(404).json({ message: 'Time-off type not found' });
    const updates = {};
    ['name', 'code', 'unit', 'allocationRequired', 'approvalWorkflow', 'payrollIntegration', 'active'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    });
    const type = await TimeOffType.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    await logAudit({ user: req.user, action: 'Updated time-off type', module: 'leave', oldValues: oldType, newValues: type });
    res.json(type);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'Time-off type code already exists' : err.message });
  }
};

export const listAllocations = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'EMPLOYEE') query.employeeId = req.user.employeeId;
    if (req.query.employeeId && canManage(req.user.role)) query.employeeId = req.query.employeeId;
    const allocations = await TimeOffAllocation.find(query)
      .populate('timeOffTypeId')
      .populate('employeeId', 'name email')
      .sort({ validityStart: -1 });
    res.json(allocations);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createAllocation = async (req, res) => {
  try {
    if (!canManage(req.user.role)) return res.status(403).json({ message: 'You do not have permission to manage allocations' });
    const { employeeId, timeOffTypeId, allocatedAmount, validityStart, validityEnd } = req.body;
    if (![employeeId, timeOffTypeId].every(isValidId)) return res.status(400).json({ message: 'Valid employee and time-off type are required' });
    if (!await Employee.exists({ _id: employeeId })) return res.status(404).json({ message: 'Employee not found' });
    if (!await TimeOffType.exists({ _id: timeOffTypeId, active: true })) return res.status(404).json({ message: 'Active time-off type not found' });
    const allocation = await TimeOffAllocation.create({ employeeId, timeOffTypeId, allocatedAmount, remainingAmount: allocatedAmount, validityStart, validityEnd, status: 'SUBMITTED' });
    await logAudit({ user: req.user, action: 'Created time-off allocation', module: 'leave', newValues: allocation });
    res.status(201).json(allocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const approveAllocation = async (req, res) => {
  try {
    if (!canManage(req.user.role)) return res.status(403).json({ message: 'You do not have permission to approve allocations' });
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid allocation ID' });
    const allocation = await TimeOffAllocation.findOneAndUpdate(
      { _id: req.params.id, status: 'SUBMITTED' },
      { $set: { status: 'AVAILABLE', approvedBy: req.user.id, approvedAt: new Date() } },
      { new: true }
    );
    if (!allocation) return res.status(409).json({ message: 'Allocation is missing or already approved' });
    await logAudit({ user: req.user, action: 'Approved time-off allocation', module: 'leave', newValues: allocation });
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
