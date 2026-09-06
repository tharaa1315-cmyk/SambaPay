import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['company', 'hr', 'payroll', 'security'] },
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, default: 'text', enum: ['text', 'number', 'boolean', 'json', 'date'] },
  isSensitive: { type: Boolean, default: false }
}, { timestamps: true });

settingSchema.index({ category: 1, key: 1 }, { unique: true });

export default mongoose.model('Setting', settingSchema);
