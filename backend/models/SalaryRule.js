import mongoose from 'mongoose';

const salaryRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  category: { type: String, required: true, enum: ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'CONTRIBUTION', 'NET'] },
  sequence: { type: Number, required: true, min: 1 },
  calculationMethod: { type: String, required: true, enum: ['FIXED', 'PERCENTAGE', 'FORMULA'] },
  fixedAmount: { type: Number, default: 0, min: 0 },
  percentage: { type: Number, default: 0, min: 0 },
  formula: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

salaryRuleSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('SalaryRule', salaryRuleSchema);
