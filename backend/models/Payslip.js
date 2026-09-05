import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema({
  payrunId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
  period: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  deductions: { type: Number, required: true },
  taxes: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
  ruleResults: [{
    code: String,
    name: String,
    category: String,
    sequence: Number,
    amount: Number
  }],
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'SENT', 'FAILED'], default: 'PENDING' },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

payslipSchema.index({ payrunId: 1, employeeId: 1 }, { unique: true });

export default mongoose.model('Payslip', payslipSchema);
