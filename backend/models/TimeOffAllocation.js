import mongoose from 'mongoose';

const timeOffAllocationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  timeOffTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', required: true },
  allocatedAmount: { type: Number, required: true, min: 0 },
  takenAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, required: true, min: 0 },
  validityStart: { type: Date, required: true },
  validityEnd: { type: Date, required: true },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'AVAILABLE', 'CANCELLED'], default: 'DRAFT' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

timeOffAllocationSchema.index({ employeeId: 1, timeOffTypeId: 1, validityStart: 1, validityEnd: 1 });

timeOffAllocationSchema.pre('validate', function(next) {
  this.remainingAmount = Math.max(0, this.allocatedAmount - this.takenAmount);
  if (this.validityEnd < this.validityStart) return next(new Error('Allocation end date must be after its start date'));
  next();
});

export default mongoose.model('TimeOffAllocation', timeOffAllocationSchema);
