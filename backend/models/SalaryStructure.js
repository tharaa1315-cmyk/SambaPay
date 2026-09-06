import mongoose from 'mongoose';

const salaryStructureSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, default: '', trim: true },
  rules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRule', required: true }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

salaryStructureSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('SalaryStructure', salaryStructureSchema);
