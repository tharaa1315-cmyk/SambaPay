import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Employee from './models/Employee.js';
import Department from './models/Department.js';
import Contract from './models/Contract.js';
import Attendance from './models/Attendance.js';
import Leave from './models/Leave.js';
import Setting from './models/Setting.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    await User.deleteMany({});
    await Employee.deleteMany({});
    await Department.deleteMany({});
    await Contract.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    await Setting.deleteMany({});

    const departments = await Department.create([
      { name: 'Engineering', description: 'Software development and technical operations', head: 'Bob Jones' },
      { name: 'Marketing', description: 'Brand, growth and communications', head: 'Diana Prince' },
      { name: 'HR', description: 'Human resources and people operations', head: 'Evan Wright' },
      { name: 'Finance', description: 'Finance, payroll and accounting', head: 'George Bluth' }
    ]);

    const users = await User.create([
      { name: 'Sarah Connor', email: 'sarah.connor@company.com', password: 'password123', role: 'ADMIN' },
      { name: 'Evan Wright', email: 'evan.wright@company.com', password: 'password123', role: 'HR_MANAGER' },
      { name: 'Fiona Gallagher', email: 'fiona.gallagher@company.com', password: 'password123', role: 'HR_PAYROLL_MANAGER' },
      { name: 'Alice Smith', email: 'alice.smith@company.com', password: 'password123', role: 'EMPLOYEE' },
      { name: 'Bob Jones', email: 'bob.jones@company.com', password: 'password123', role: 'EMPLOYEE' },
      { name: 'Charlie Davis', email: 'charlie.davis@company.com', password: 'password123', role: 'EMPLOYEE' },
      { name: 'Diana Prince', email: 'diana.prince@company.com', password: 'password123', role: 'EMPLOYEE' },
      { name: 'George Bluth', email: 'george.bluth@company.com', password: 'password123', role: 'EMPLOYEE' }
    ]);

    const employees = await Employee.create([
      { name: 'Sarah Connor', email: 'sarah.connor@company.com', phone: '+1 (555) 000-0000', department: 'Management', position: 'CEO', manager: '', employmentType: 'Full-time', joiningDate: '2018-01-01', status: 'Active', salary: 200000 },
      { name: 'Alice Smith', email: 'alice.smith@company.com', phone: '+1 (555) 000-0001', department: 'Engineering', position: 'Frontend Developer', manager: 'Bob Jones', employmentType: 'Full-time', joiningDate: '2023-01-15', status: 'Active', salary: 95000 },
      { name: 'Bob Jones', email: 'bob.jones@company.com', phone: '+1 (555) 000-0002', department: 'Engineering', position: 'Engineering Manager', manager: 'Sarah Connor', employmentType: 'Full-time', joiningDate: '2021-11-01', status: 'Active', salary: 135000 },
      { name: 'Charlie Davis', email: 'charlie.davis@company.com', phone: '+1 (555) 000-0003', department: 'Marketing', position: 'Marketing Specialist', manager: 'Diana Prince', employmentType: 'Contract', joiningDate: '2023-06-20', status: 'Active', salary: 75000 },
      { name: 'Diana Prince', email: 'diana.prince@company.com', phone: '+1 (555) 000-0004', department: 'Marketing', position: 'Marketing Director', manager: 'Sarah Connor', employmentType: 'Full-time', joiningDate: '2020-03-10', status: 'Active', salary: 145000 },
      { name: 'Evan Wright', email: 'evan.wright@company.com', phone: '+1 (555) 000-0005', department: 'HR', position: 'HR Manager', manager: 'Sarah Connor', employmentType: 'Full-time', joiningDate: '2022-08-05', status: 'Active', salary: 110000 },
      { name: 'Fiona Gallagher', email: 'fiona.gallagher@company.com', phone: '+1 (555) 000-0006', department: 'Finance', position: 'Payroll Specialist', manager: 'George Bluth', employmentType: 'Full-time', joiningDate: '2024-01-10', status: 'Active', salary: 80000 },
      { name: 'George Bluth', email: 'george.bluth@company.com', phone: '+1 (555) 000-0007', department: 'Finance', position: 'Finance Director', manager: 'Sarah Connor', employmentType: 'Full-time', joiningDate: '2019-05-15', status: 'Active', salary: 160000 }
    ]);

    for (const user of users) {
      const employee = employees.find(e => e.email === user.email);
      if (employee) {
        await User.findByIdAndUpdate(user._id, { employeeId: employee._id });
      }
    }

    const contracts = await Contract.create([
      { employeeId: employees[3]._id, employeeName: employees[3].name, contractType: 'Fixed Term', startDate: '2023-06-20', endDate: '2024-06-19', salary: 75000, status: 'Expiring', renewalStatus: 'Pending' },
      { employeeId: employees[1]._id, employeeName: employees[1].name, contractType: 'Indefinite', startDate: '2023-01-15', endDate: null, salary: 95000, status: 'Active', renewalStatus: 'Not Applicable' },
      { employeeId: employees[2]._id, employeeName: employees[2].name, contractType: 'Indefinite', startDate: '2021-11-01', endDate: null, salary: 135000, status: 'Active', renewalStatus: 'Not Applicable' }
    ]);

    const today = new Date().toISOString().split('T')[0];
    await Attendance.create([
      { employeeId: employees[1]._id, employeeName: employees[1].name, date: today, checkIn: '09:00', checkOut: '17:00', status: 'Present', workingHours: 8 },
      { employeeId: employees[3]._id, employeeName: employees[3].name, date: today, checkIn: '09:15', checkOut: '17:30', status: 'Late', workingHours: 8.25 }
    ]);

    await Leave.create([
      { employeeId: employees[2]._id, employeeName: 'Charlie Davis', type: 'Annual Leave', startDate: '2024-12-20', endDate: '2024-12-26', status: 'Pending', reason: 'Family vacation' }
    ]);

    await Setting.create([
      { category: 'company', key: 'name', value: 'SambaPay Inc.', type: 'text' },
      { category: 'company', key: 'address', value: '123 Business Ave, Suite 100', type: 'text' },
      { category: 'company', key: 'contactEmail', value: 'hr@company.com', type: 'text' },
      { category: 'company', key: 'currency', value: 'USD', type: 'text' },
      { category: 'hr', key: 'leaveTypes', value: ['Annual Leave', 'Sick Leave', 'Unpaid Leave', 'Maternity', 'Paternity'], type: 'json' },
      { category: 'payroll', key: 'schedule', value: 'Monthly', type: 'text' },
      { category: 'payroll', key: 'taxRate', value: 0.15, type: 'number' }
    ]);

    console.log('Seed data created successfully!');
    console.log('Users:', users.map(u => ({ email: u.email, role: u.role, password: 'password123' })));
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();
