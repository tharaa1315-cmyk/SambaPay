import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'Unknown' },
  action: { type: String, required: true },
  module: { type: String, required: true },
  oldValues: { type: mongoose.Schema.Types.Mixed, default: null },
  newValues: { type: mongoose.Schema.Types.Mixed, default: null },
  resourceId: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
