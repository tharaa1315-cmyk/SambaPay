import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { logAudit } from '../utils/audit.js';

export const getAttendance = async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const query = {};

    if (date) query.date = date;
    if (employeeId) query.employeeId = employeeId;

    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }

    const records = await Attendance.find(query)
      .populate('employeeId', 'name email department')
      .sort({ date: -1 });

    res.json(records.map(r => ({
      id: r._id,
      employeeId: r.employeeId._id,
      employeeName: r.employeeId.name,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      workingHours: r.workingHours
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createAttendance = async (req, res) => {
  try {
    let { employeeId, date, checkIn, checkOut, status, workingHours } = req.body;

    if (req.user.role === 'EMPLOYEE') {
      employeeId = req.user.employeeId;
    }

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({ employeeId, date: attendanceDate });

    if (existing) {
      const updateData = {};
      if (checkOut !== undefined && checkOut !== null) {
        updateData.checkOut = checkOut;
      }
      if (status) {
        updateData.status = status;
      }
      if (checkIn && checkOut) {
        const [inH, inM] = (checkIn || existing.checkIn).split(':').map(Number);
        const [outH, outM] = checkOut.split(':').map(Number);
        let hours = (outH + outM / 60) - (inH + inM / 60);
        if (hours < 0) hours = 0;
        updateData.workingHours = hours;
      }

      const updated = await Attendance.findByIdAndUpdate(existing._id, updateData, { new: true });

      await logAudit({
        user: req.user,
        action: 'Updated attendance record',
        module: 'attendance',
        newValues: updated
      });

      return res.json({
        id: updated._id,
        employeeId: updated.employeeId,
        employeeName: updated.employeeName,
        date: updated.date,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        status: updated.status,
        workingHours: updated.workingHours
      });
    }

    let calculatedHours = workingHours;
    if (checkIn && checkOut && !calculatedHours) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      calculatedHours = (outH + outM / 60) - (inH + inM / 60);
      if (calculatedHours < 0) calculatedHours = 0;
    }

    const attendance = await Attendance.create({
      employeeId,
      employeeName: employee.name,
      date: attendanceDate,
      checkIn,
      checkOut,
      status: status || (checkIn ? 'Present' : 'Absent'),
      workingHours: calculatedHours || 0
    });

    await logAudit({
      user: req.user,
      action: 'Created attendance record',
      module: 'attendance',
      newValues: attendance
    });

    res.status(201).json({
      id: attendance._id,
      employeeId: attendance.employeeId,
      employeeName: attendance.employeeName,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workingHours: attendance.workingHours
    });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const updateData = { checkIn, checkOut, status };
    if (req.user.role === 'EMPLOYEE') {
      if (String(attendance.employeeId) !== String(req.user.employeeId)) {
        return res.status(403).json({ message: 'You can only update your own attendance' });
      }
      // employee can only update their own checkIn/checkOut
      delete updateData.status; // status is system/admin controlled
    }

    if (checkIn && checkOut) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      let hours = (outH + outM / 60) - (inH + inM / 60);
      if (hours < 0) hours = 0;
      updateData.workingHours = hours;
    }

    const oldValues = { ...attendance.toObject() };
    const updated = await Attendance.findByIdAndUpdate(id, updateData, { new: true });

    await logAudit({
      user: req.user,
      action: 'Updated attendance record',
      module: 'attendance',
      oldValues,
      newValues: updated
    });

    res.json({
      id: updated._id,
      employeeId: updated.employeeId,
      employeeName: updated.employeeName,
      date: updated.date,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
      status: updated.status,
      workingHours: updated.workingHours
    });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
