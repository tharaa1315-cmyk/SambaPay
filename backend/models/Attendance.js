import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: { type: String, default: null },
  checkOut: { type: String, default: null },
  status: { type: String, default: 'Present', enum: ['Present', 'Late', 'Absent', 'Half Day'] },
  workingHours: { type: Number, default: 0 }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
