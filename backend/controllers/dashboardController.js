import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';

export const getStats = async (req, res) => {
  try {
    if (req.user.role === 'EMPLOYEE') {
      const attendanceTrend = await Attendance.aggregate([
        { $match: { employeeId: req.user.employeeId } },
        { $sort: { date: -1 } },
        { $limit: 7 },
        { $project: { date: '$date', hours: '$workingHours' } }
      ]);
      return res.json({ attendanceTrend: attendanceTrend.reverse() });
    }
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const onLeaveEmployees = await Employee.countDocuments({ status: 'On Leave' });

    const totalSalary = await Employee.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: null, total: { $sum: '$salary' } } }
    ]);
    const monthlyPayroll = totalSalary.length > 0 ? totalSalary[0].total / 12 : 0;

    const attendanceToday = await Attendance.countDocuments({
      date: new Date().toISOString().split('T')[0]
    });
    const presentToday = await Attendance.countDocuments({
      date: new Date().toISOString().split('T')[0],
      status: { $in: ['Present', 'Late'] }
    });

    const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });

    const payrollTrend = await Payroll.aggregate([
      { $match: { status: 'Paid' } },
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      { $project: { month: '$period', cost: '$totalNet' } }
    ]);

    res.json({
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      monthlyPayroll,
      attendanceToday,
      presentToday,
      pendingLeaves,
      payrollTrend: payrollTrend.reverse()
    });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
