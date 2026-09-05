import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

organizationSchema.index({ 'members.userId': 1 });

export default mongoose.model('Organization', organizationSchema);
