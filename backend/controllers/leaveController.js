import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import TimeOffType from '../models/TimeOffType.js';
import TimeOffAllocation from '../models/TimeOffAllocation.js';
import { logAudit } from '../utils/audit.js';

const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return null;
  return Math.floor((end - start) / 86400000) + 1;
};

export const getLeave = async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;

    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }

    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const employeeId = req.user.role === 'EMPLOYEE' ? req.user.employeeId : req.body.employeeId;
    const duration = calculateDuration(startDate, endDate);
    if (!employeeId || !duration) return res.status(400).json({ message: 'Valid employee and date range are required' });
    const employee = await Employee.findById(employeeId).select('name');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const timeOffType = req.body.timeOffTypeId ? await TimeOffType.findOne({ _id: req.body.timeOffTypeId, active: true }) : null;
    if (req.body.timeOffTypeId && !timeOffType) return res.status(404).json({ message: 'Active time-off type not found' });

    const overlapping = await Leave.exists({
      employeeId,
      status: { $in: ['Pending', 'Approved'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });
    if (overlapping) return res.status(409).json({ message: 'Leave request overlaps an existing request' });

    const leave = await Leave.create({
      employeeId,
      employeeName: employee.name,
      type,
      timeOffTypeId: timeOffType?._id || null,
      duration,
      startDate,
      endDate,
      reason,
      status: 'Pending'
    });

    await logAudit({
      user: req.user,
      action: 'Created leave request',
      module: 'leave',
      newValues: leave
    });

    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'Leave request is not in a pending state' });
    }

    if (leave.timeOffTypeId && !leave.balanceDeducted) {
      const timeOffType = await TimeOffType.findById(leave.timeOffTypeId);
      if (timeOffType?.allocationRequired) {
        const allocation = await TimeOffAllocation.findOneAndUpdate(
          {
            employeeId: leave.employeeId,
            timeOffTypeId: leave.timeOffTypeId,
            status: 'AVAILABLE',
            validityStart: { $lte: new Date(leave.startDate) },
            validityEnd: { $gte: new Date(leave.endDate) },
            remainingAmount: { $gte: leave.duration }
          },
          { $inc: { takenAmount: leave.duration, remainingAmount: -leave.duration } },
          { new: true }
        );
        if (!allocation) return res.status(409).json({ message: 'Insufficient available time-off balance' });
        leave.balanceDeducted = true;
      }
    }

    const oldValues = { ...leave.toObject() };
    leave.status = 'Approved';
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    await leave.save();

    await logAudit({
      user: req.user,
      action: 'Approved leave request',
      module: 'leave',
      oldValues,
      newValues: leave
    });

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'Leave request is not in a pending state' });
    }

    const oldValues = { ...leave.toObject() };
    leave.status = 'Rejected';
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    await leave.save();

    await logAudit({
      user: req.user,
      action: 'Rejected leave request',
      module: 'leave',
      oldValues,
      newValues: leave
    });

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    if (req.user.role === 'EMPLOYEE' && String(leave.employeeId) !== String(req.user.employeeId)) {
      return res.status(403).json({ message: 'You can only cancel your own leave requests' });
    }
    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending leave requests can be cancelled' });
    }

    const oldValues = { ...leave.toObject() };
    leave.status = 'Cancelled';
    await leave.save();

    await logAudit({
      user: req.user,
      action: 'Cancelled leave request',
      module: 'leave',
      oldValues,
      newValues: leave
    });

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
