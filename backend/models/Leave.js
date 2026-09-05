import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  type: { type: String, required: true, trim: true },
  timeOffTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', default: null },
  duration: { type: Number, min: 0, default: 0 },
  balanceDeducted: { type: Boolean, default: false },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'] },
  reason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Leave', leaveSchema);
