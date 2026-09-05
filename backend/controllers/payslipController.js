import Payslip from '../models/Payslip.js';
import { logAudit } from '../utils/audit.js';

export const getPayslips = async (req, res) => {
  try {
    if (req.user.role === 'EMPLOYEE') {
      const payslips = await Payslip.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
      return res.json(payslips);
    }

    const payslips = await Payslip.find().sort({ createdAt: -1 });
    res.json(payslips);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const payslip = await Payslip.findById(id);

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    if (req.user.role === 'EMPLOYEE') {
      if (payslip.employeeId.toString() !== req.user.employeeId) {
        return res.status(403).json({ message: 'You can only view your own payslips' });
      }
    }

    res.json(payslip);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const payslip = await Payslip.findById(id);

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    if (req.user.role === 'EMPLOYEE') {
      if (payslip.employeeId.toString() !== req.user.employeeId) {
        return res.status(403).json({ message: 'You can only download your own payslips' });
      }
    }

    await logAudit({
      user: req.user,
      action: 'Downloaded payslip',
      module: 'payslips',
      resourceId: id
    });

    const safePeriod = (payslip.period || '').replace(/[^a-zA-Z0-9-]/g, '');
    const safeName = (payslip.employeeName || '').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${safePeriod}-${safeName}.csv"`);

    const csvRows = [
      ['Period', 'Employee', 'Basic', 'Allowances', 'Gross', 'Deductions', 'Taxes', 'Net'],
      [payslip.period, payslip.employeeName, payslip.basicSalary, payslip.allowances, payslip.grossSalary, payslip.deductions, payslip.taxes, payslip.netSalary]
    ];
    res.send(csvRows.map(row => row.join(',')).join('\n'));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
