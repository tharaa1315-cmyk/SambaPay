import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  department: { type: String, required: true },
  position: { type: String, required: true },
  manager: { type: String, default: '' },
  employmentType: { type: String, required: true, enum: ['Full-time', 'Part-time', 'Contract'] },
  joiningDate: { type: Date, required: true },
  status: { type: String, default: 'Active', enum: ['Active', 'On Leave', 'Inactive'] },
  salary: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  bankName: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  routingNumber: { type: String, default: '' },
  timeZone: { type: String, default: 'America/New_York' },
  schedule: { type: String, default: 'standard' },
  workingScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule', default: null }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);
