import Employee from '../models/Employee.js';
import Contract from '../models/Contract.js';
import mongoose from 'mongoose';
import { logAudit } from '../utils/audit.js';

const employeeFields = [
  'name', 'email', 'phone', 'address', 'department', 'position', 'manager',
  'employmentType', 'joiningDate', 'status', 'salary', 'bonus', 'bankName',
  'accountName', 'accountNumber', 'routingNumber', 'timeZone', 'schedule', 'workingScheduleId'
];

const pickFields = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.prototype.hasOwnProperty.call(source, field))
    .map((field) => [field, source[field]])
);

const isValidId = (value) => mongoose.isValidObjectId(value);

export const getEmployees = async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;
    if (req.user.role === 'EMPLOYEE') {
      query._id = req.user.employeeId;
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.user.role === 'EMPLOYEE') {
      if (id !== String(req.user.employeeId)) {
        return res.status(403).json({ message: 'You can only view your own profile' });
      }
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(pickFields(req.body, employeeFields));
    await logAudit({
      user: req.user,
      action: 'Created employee',
      module: 'employees',
      newValues: employee
    });
    res.status(201).json(employee);
  } catch (err) {
    if (err.name === 'ValidationError' || err.code === 11000) {
      return res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'An employee with this email already exists' : err.message });
    }
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    if (req.user.role === 'EMPLOYEE' && id !== String(req.user.employeeId)) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const updates = pickFields(req.body, employeeFields);
    if (req.user.role === 'EMPLOYEE') {
      // Employees cannot change sensitive fields
      delete updates.salary;
      delete updates.role;
      delete updates.department;
      delete updates.position;
      delete updates.manager;
      delete updates.status;
      delete updates.employmentType;
      delete updates.joiningDate;
      delete updates.salary;
      delete updates.bonus;
      delete updates.bankName;
      delete updates.accountName;
      delete updates.accountNumber;
      delete updates.routingNumber;
      delete updates.schedule;
    }

    const oldEmployee = await Employee.findById(id);
    if (!oldEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = await Employee.findByIdAndUpdate(id, updates, { new: true });

    await logAudit({
      user: req.user,
      action: 'Updated employee',
      module: 'employees',
      oldValues: oldEmployee,
      newValues: employee
    });

    res.json(employee);
  } catch (err) {
    if (err.name === 'ValidationError' || err.code === 11000) {
      return res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'An employee with this email already exists' : err.message });
    }
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    const employee = await Employee.findByIdAndUpdate(id, { status: 'Inactive' }, { new: true });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await logAudit({
      user: req.user,
      action: 'Deleted employee',
      module: 'employees',
      oldValues: employee,
      newValues: { status: 'Inactive' }
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getContracts = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }
    const contracts = await Contract.find(query)
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id).populate('employeeId', 'name email department');

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    if (req.user.role === 'EMPLOYEE' && String(contract.employeeId._id) !== String(req.user.employeeId)) {
      return res.status(403).json({ message: 'You can only view your own contract' });
    }

    res.json(contract);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createContract = async (req, res) => {
  try {
    const contract = await Contract.create(req.body);
    await logAudit({
      user: req.user,
      action: 'Created contract',
      module: 'contracts',
      newValues: contract
    });
    res.status(201).json(contract);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
