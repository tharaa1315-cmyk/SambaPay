import mongoose from 'mongoose';
import WorkingSchedule from '../models/WorkingSchedule.js';
import { logAudit } from '../utils/audit.js';

const isValidId = (value) => mongoose.isValidObjectId(value);
const fields = ['name', 'type', 'weeklyPattern', 'active'];

export const listWorkingSchedules = async (req, res) => {
  try {
    const schedules = await WorkingSchedule.find().sort({ name: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createWorkingSchedule = async (req, res) => {
  try {
    const values = Object.fromEntries(fields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field)).map((field) => [field, req.body[field]]));
    const schedule = await WorkingSchedule.create(values);
    await logAudit({ user: req.user, action: 'Created working schedule', module: 'attendance', newValues: schedule });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateWorkingSchedule = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid working schedule ID' });
    const oldSchedule = await WorkingSchedule.findById(req.params.id);
    if (!oldSchedule) return res.status(404).json({ message: 'Working schedule not found' });
    const values = Object.fromEntries(fields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field)).map((field) => [field, req.body[field]]));
    const schedule = await WorkingSchedule.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true });
    await logAudit({ user: req.user, action: 'Updated working schedule', module: 'attendance', oldValues: oldSchedule, newValues: schedule });
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
