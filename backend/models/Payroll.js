import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  period: { type: String, required: true },
  name: { type: String, default: '' },
  periodStart: { type: Date, default: null },
  periodEnd: { type: Date, default: null },
  salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
  status: { type: String, default: 'Draft', enum: ['Draft', 'Under Review', 'Approved', 'Paid'] },
  employees: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 }
  }],
  totalGross: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Payroll', payrollSchema);
