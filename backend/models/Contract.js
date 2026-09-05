import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  contractType: { type: String, required: true, enum: ['Indefinite', 'Fixed Term', 'Contract'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  salary: { type: Number, required: true },
  wage: { type: Number, default: 0 },
  department: { type: String, default: '' },
  position: { type: String, default: '' },
  salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
  workingScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule', default: null },
  status: { type: String, default: 'Active', enum: ['Active', 'Expiring', 'Expired'] },
  renewalStatus: { type: String, default: 'Not Applicable', enum: ['Pending', 'Approved', 'Rejected', 'Not Applicable'] }
}, { timestamps: true });

export default mongoose.model('Contract', contractSchema);
