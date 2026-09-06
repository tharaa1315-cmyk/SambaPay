import mongoose from 'mongoose';

const timeOffTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  unit: { type: String, enum: ['DAYS', 'HOURS'], default: 'DAYS' },
  allocationRequired: { type: Boolean, default: true },
  approvalWorkflow: { type: Boolean, default: true },
  payrollIntegration: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

timeOffTypeSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('TimeOffType', timeOffTypeSchema);
