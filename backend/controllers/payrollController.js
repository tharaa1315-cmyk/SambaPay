import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Payslip from '../models/Payslip.js';
import Contract from '../models/Contract.js';
import SalaryStructure from '../models/SalaryStructure.js';
import { executeSalaryRules } from '../utils/salaryEngine.js';
import { logAudit } from '../utils/audit.js';

const isValidId = (value) => mongoose.isValidObjectId(value);

const getPeriodDates = (payrun) => {
  if (payrun.periodStart && payrun.periodEnd) {
    return { start: new Date(payrun.periodStart), end: new Date(payrun.periodEnd) };
  }
  const dates = String(payrun.period || '').match(/\d{4}-\d{2}-\d{2}/g);
  if (dates?.length >= 2) return { start: new Date(dates[0]), end: new Date(dates[1]) };
  return null;
};

const performPayrollCalculation = async (payrun) => {
  const period = getPeriodDates(payrun);
  const structure = payrun.salaryStructureId
    ? await SalaryStructure.findById(payrun.salaryStructureId).populate('rules')
    : null;
  if (payrun.salaryStructureId && !structure) throw new Error('Salary structure not found');

  const employees = await Promise.all(payrun.employees.map(async (employee) => {
    const contractQuery = { employeeId: employee.employeeId };
    if (period) {
      contractQuery.startDate = { $lte: period.end };
      contractQuery.$or = [{ endDate: null }, { endDate: { $gte: period.start } }];
    }
    const contract = await Contract.findOne(contractQuery).sort({ startDate: -1 });
    const basicSalary = contract?.wage || contract?.salary || employee.basicSalary || 0;
    // With no salary structure selected, fall back to paying the raw base
    // salary (gross = basic) instead of silently computing all zeros.
    const calculation = structure
      ? executeSalaryRules(structure.rules, basicSalary)
      : {
          results: [],
          basicSalary,
          allowances: 0,
          grossSalary: Math.round(basicSalary * 100) / 100,
          deductions: 0,
          taxes: 0,
          netSalary: Math.round(basicSalary * 100) / 100
        };

    return {
      ...employee.toObject ? employee.toObject() : employee,
      basicSalary: calculation.basicSalary,
      allowances: calculation.allowances,
      grossSalary: calculation.grossSalary,
      deductions: calculation.deductions,
      taxes: calculation.taxes,
      netSalary: calculation.netSalary,
      ruleResults: calculation.results,
      contractId: contract?._id || null
    };
  }));

  const totalGross = employees.reduce((sum, e) => sum + e.grossSalary, 0);
  const totalDeductions = employees.reduce((sum, e) => sum + e.deductions, 0);
  const totalNet = employees.reduce((sum, e) => sum + e.netSalary, 0);

  return { employees, totalGross, totalDeductions, totalNet };
};

export const getPayroll = async (req, res) => {
  try {
    if (req.user.role === 'EMPLOYEE') {
      const payslips = await Payslip.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
      return res.json(payslips);
    }

    const payruns = await Payroll.find().sort({ createdAt: -1 });
    res.json(payruns);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'A valid payrun ID is required' });
    }
    const payrun = await Payroll.findById(id);

    if (!payrun) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (req.user.role === 'EMPLOYEE') {
      const hasAccess = payrun.employees.some(e => e.employeeId.toString() === req.user.employeeId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this payroll' });
      }
    }

    res.json(payrun);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createPayroll = async (req, res) => {
  try {
    const { period, periodStart, periodEnd, name, salaryStructureId, employeeIds } = req.body;

    if (!period || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Period and employee IDs are required' });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    if (employees.length === 0) {
      return res.status(404).json({ message: 'No employees found' });
    }

    const payrollEmployees = employees.map(emp => ({
      employeeId: emp._id,
      employeeName: emp.name,
      basicSalary: emp.salary || 0,
      allowances: 0,
      grossSalary: 0,
      deductions: 0,
      taxes: 0,
      netSalary: 0
    }));

    const payrun = await Payroll.create({
      period,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      name: name || period,
      salaryStructureId: salaryStructureId || null,
      employees: payrollEmployees,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0
    });

    await logAudit({
      user: req.user,
      action: 'Created payroll',
      module: 'payroll',
      newValues: payrun
    });

    res.status(201).json(payrun);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'A valid payrun ID is required' });
    }
    const payrun = await Payroll.findById(id);

    if (!payrun) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payrun.status !== 'Under Review') {
      return res.status(400).json({ message: 'Only payrolls under review can be approved' });
    }

    const oldValues = { status: payrun.status };
    payrun.status = 'Approved';
    payrun.approvedBy = req.user.id;
    payrun.approvedAt = new Date();
    await payrun.save();

    await logAudit({
      user: req.user,
      action: 'Approved payroll',
      module: 'payroll',
      oldValues,
      newValues: { status: 'Approved' }
    });

    res.json(payrun);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

import mongoose from 'mongoose';

export const processPayroll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'A valid payrun ID is required' });
    }
    const payrun = await Payroll.findById(id);

    if (!payrun) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payrun.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved payrolls can be processed' });
    }

    const oldValues = { status: payrun.status };
    payrun.status = 'Paid';
    payrun.processedBy = req.user.id;
    payrun.processedAt = new Date();
    await payrun.save({ session });

    const payslips = payrun.employees.map(emp => ({
      payrunId: payrun._id,
      period: payrun.period,
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      basicSalary: emp.basicSalary,
      allowances: emp.allowances,
      grossSalary: emp.grossSalary,
      deductions: emp.deductions,
      taxes: emp.taxes,
      netSalary: emp.netSalary,
      salaryStructureId: payrun.salaryStructureId || null,
      ruleResults: emp.ruleResults || [],
      paymentStatus: 'PAID'
    }));

    await Payslip.insertMany(payslips, { session, ordered: true });

    await logAudit({
      user: req.user,
      action: 'Processed payroll',
      module: 'payroll',
      oldValues,
      newValues: { status: 'Paid' }
    });

    await session.commitTransaction();
    session.endSession();
    res.json(payrun);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const calculatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'A valid payrun ID is required' });
    }
    const payrun = await Payroll.findById(id);

    if (!payrun) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    const { employees, totalGross, totalDeductions, totalNet } = await performPayrollCalculation(payrun);
    payrun.employees = employees;
    payrun.totalGross = totalGross;
    payrun.totalDeductions = totalDeductions;
    payrun.totalNet = totalNet;
    payrun.status = 'Under Review';
    await payrun.save();

    await logAudit({
      user: req.user,
      action: 'Calculated payroll',
      module: 'payroll',
      newValues: { status: 'Under Review' }
    });

    res.json(payrun);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
