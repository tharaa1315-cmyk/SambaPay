import mongoose from 'mongoose';

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, required: true, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  breakDuration: { type: Number, default: 0, min: 0 }
}, { _id: false });

const workingScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['FIXED', 'FLEXIBLE', 'SHIFT'], default: 'FIXED' },
  weeklyPattern: { type: [scheduleDaySchema], default: [] },
  weeklyHours: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const hoursBetween = (startTime, endTime) => {
  if (typeof startTime !== 'string' || typeof endTime !== 'string') return 0;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  let minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes;
};

workingScheduleSchema.pre('validate', function(next) {
  this.weeklyHours = Math.round(this.weeklyPattern.reduce((total, day) => {
    if (!day) return total;
    return total + Math.max(0, hoursBetween(day.startTime, day.endTime) - (Number(day.breakDuration) || 0));
  }, 0) / 60 * 100) / 100;
  next();
});

export default mongoose.model('WorkingSchedule', workingScheduleSchema);
