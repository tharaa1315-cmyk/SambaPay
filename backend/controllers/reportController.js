import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import { logAudit } from '../utils/audit.js';

const getReportAccess = (role) => {
  switch (role) {
    case 'ADMIN': return 'all';
    case 'HR_MANAGER': return 'hr';
    case 'HR_PAYROLL_USER':
    case 'HR_PAYROLL_MANAGER': return 'payroll';
    default: return 'limited';
  }
};

export const getEmployeeReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited') {
      return res.status(403).json({ message: 'You do not have permission to view this report' });
    }

    const { department, employmentType } = req.query;
    const query = {};
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    const employees = await Employee.find(query).sort({ name: 1 });
    res.json(employees.map(e => ({
      id: e._id,
      name: e.name,
      department: e.department,
      position: e.position,
      type: e.employmentType,
      status: e.status,
      joinDate: e.joiningDate
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getAttendanceReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited') {
      return res.status(403).json({ message: 'You do not have permission to view this report' });
    }

    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(query).populate('employeeId', 'name department').sort({ date: -1 });
    res.json(records.map(r => ({
      id: r._id,
      employee: r.employeeId?.name || r.employeeName,
      department: r.employeeId?.department || '',
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      hours: r.workingHours,
      status: r.status
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getPayrollReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited' || access === 'hr') {
      return res.status(403).json({ message: 'You do not have permission to view this report' });
    }

    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const payruns = await Payroll.find(query).sort({ createdAt: -1 });
    res.json(payruns.map(r => ({
      id: r._id,
      period: r.period,
      status: r.status,
      employees: r.employees?.length || 0,
      totalGross: r.totalGross,
      totalNet: r.totalNet
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getLeaveReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited') {
      return res.status(403).json({ message: 'You do not have permission to view this report' });
    }

    const { startDate, endDate, status } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) query.status = status;

    const leaves = await Leave.find(query).populate('employeeId', 'name department').sort({ createdAt: -1 });
    res.json(leaves.map(l => ({
      id: l._id,
      employee: l.employeeId?.name || l.employeeName,
      department: l.employeeId?.department || '',
      type: l.type,
      start: l.startDate,
      end: l.endDate,
      status: l.status
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getSalaryReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited') {
      return res.status(403).json({ message: 'You do not have permission' });
    }
    const { department } = req.query;
    const query = {};
    if (department) query.department = department;

    const emps = await Employee.find(query);
    res.json(emps.map(e => ({
      id: e._id,
      name: e.name,
      department: e.department,
      annualSalary: e.salary || 0,
      monthlySalary: (e.salary || 0) / 12,
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getDepartmentReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited' || access === 'payroll') {
      return res.status(403).json({ message: 'You do not have permission' });
    }
    const emps = await Employee.find();
    const deptMap = {};
    emps.forEach(e => {
      if (!deptMap[e.department]) {
        deptMap[e.department] = { department: e.department, headcount: 0, totalSalary: 0, activeCount: 0 };
      }
      deptMap[e.department].headcount++;
      deptMap[e.department].totalSalary += e.salary || 0;
      if (e.status === 'Active') deptMap[e.department].activeCount++;
    });
    res.json(Object.values(deptMap).map(d => ({
      ...d,
      avgSalary: d.headcount ? d.totalSalary / d.headcount : 0
    })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getTaxReport = async (req, res) => {
  try {
    const access = getReportAccess(req.user.role);
    if (access === 'limited' || access === 'hr') {
      return res.status(403).json({ message: 'You do not have permission' });
    }
    const { startDate, endDate } = req.query;
    const query = { status: 'Paid' };
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const runs = await Payroll.find(query).sort({ createdAt: -1 });
    const rows = [];
    runs.forEach(r => {
      (r.employees || []).forEach(emp => {
        rows.push({
          id: emp.employeeId,
          employee: emp.employeeName,
          period: r.period,
          grossSalary: emp.grossSalary,
          taxes: emp.taxes,
          deductions: emp.deductions,
          netPay: emp.netSalary,
        });
      });
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
