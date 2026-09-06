const employees = [
  { id: 'emp-1', name: 'Sarah Connor', email: 'sarah.connor@company.com', phone: '+1 (555) 000-0000', department: 'Management', position: 'CEO', employmentType: 'Full-time', joiningDate: '2018-01-01', status: 'Active', salary: 200000 },
  { id: 'emp-2', name: 'Alice Smith', email: 'alice.smith@company.com', phone: '+1 (555) 000-0001', department: 'Engineering', position: 'Frontend Developer', employmentType: 'Full-time', joiningDate: '2023-01-15', status: 'Active', salary: 95000 },
  { id: 'emp-3', name: 'Bob Jones', email: 'bob.jones@company.com', phone: '+1 (555) 000-0002', department: 'Engineering', position: 'Engineering Manager', employmentType: 'Full-time', joiningDate: '2021-11-01', status: 'Active', salary: 135000 },
  { id: 'emp-4', name: 'Charlie Davis', email: 'charlie.davis@company.com', phone: '+1 (555) 000-0003', department: 'Marketing', position: 'Marketing Specialist', employmentType: 'Contract', joiningDate: '2023-06-20', status: 'Active', salary: 75000 },
  { id: 'emp-5', name: 'Diana Prince', email: 'diana.prince@company.com', phone: '+1 (555) 000-0004', department: 'Marketing', position: 'Marketing Director', employmentType: 'Full-time', joiningDate: '2020-03-10', status: 'Active', salary: 145000 },
  { id: 'emp-6', name: 'Evan Wright', email: 'evan.wright@company.com', phone: '+1 (555) 000-0005', department: 'HR', position: 'HR Manager', employmentType: 'Full-time', joiningDate: '2022-08-05', status: 'Active', salary: 110000 },
  { id: 'emp-7', name: 'Fiona Gallagher', email: 'fiona.gallagher@company.com', phone: '+1 (555) 000-0006', department: 'Finance', position: 'Payroll Specialist', employmentType: 'Full-time', joiningDate: '2024-01-10', status: 'Active', salary: 80000 },
  { id: 'emp-8', name: 'George Bluth', email: 'george.bluth@company.com', phone: '+1 (555) 000-0007', department: 'Finance', position: 'Finance Director', employmentType: 'Full-time', joiningDate: '2019-05-15', status: 'Active', salary: 160000 }
];

const attendance = [
  { id: 'att-1', employeeId: 'emp-2', employeeName: 'Alice Smith', date: '2026-09-05', checkIn: '09:00', checkOut: '17:00', status: 'Present', workingHours: 8 },
  { id: 'att-2', employeeId: 'emp-3', employeeName: 'Bob Jones', date: '2026-09-05', checkIn: '09:15', checkOut: '17:30', status: 'Late', workingHours: 8.25 },
  { id: 'att-3', employeeId: 'emp-4', employeeName: 'Charlie Davis', date: '2026-09-05', checkIn: '08:55', checkOut: '17:00', status: 'Present', workingHours: 8 },
  { id: 'att-4', employeeId: 'emp-5', employeeName: 'Diana Prince', date: '2026-09-05', checkIn: '09:02', checkOut: null, status: 'Present', workingHours: 0 },
  { id: 'att-5', employeeId: 'emp-6', employeeName: 'Evan Wright', date: '2026-09-05', checkIn: '09:00', checkOut: '17:00', status: 'Present', workingHours: 8 }
];

const leave = [
  { id: 'leave-1', employeeId: 'emp-3', employeeName: 'Bob Jones', type: 'Annual Leave', startDate: '2026-09-12', endDate: '2026-09-16', status: 'Pending', reason: 'Family vacation' },
  { id: 'leave-2', employeeId: 'emp-4', employeeName: 'Charlie Davis', type: 'Sick Leave', startDate: '2026-09-03', endDate: '2026-09-04', status: 'Approved', reason: 'Medical appointment' }
];

const contracts = [
  { id: 'contract-1', employeeId: 'emp-4', employeeName: 'Charlie Davis', contractType: 'Fixed Term', startDate: '2023-06-20', endDate: '2027-06-19', salary: 75000, status: 'Active', renewalStatus: 'Pending' },
  { id: 'contract-2', employeeId: 'emp-2', employeeName: 'Alice Smith', contractType: 'Indefinite', startDate: '2023-01-15', endDate: null, salary: 95000, status: 'Active', renewalStatus: 'Not Applicable' },
  { id: 'contract-3', employeeId: 'emp-3', employeeName: 'Bob Jones', contractType: 'Indefinite', startDate: '2021-11-01', endDate: null, salary: 135000, status: 'Active', renewalStatus: 'Not Applicable' }
];

const payroll = [
  { id: 'payroll-1', period: 'August 2026', payDate: '2026-08-31', status: 'Processed', employeeCount: 8, totalGross: 960000, totalDeductions: 144000, totalNet: 816000 },
  { id: 'payroll-2', period: 'September 2026', payDate: '2026-09-30', status: 'Draft', employeeCount: 8, totalGross: 960000, totalDeductions: 144000, totalNet: 816000 }
];

const payslips = employees.slice(1, 5).map((employee, index) => ({
  id: `payslip-${index + 1}`,
  employeeId: employee.id,
  employeeName: employee.name,
  period: 'August 2026',
  grossSalary: employee.salary / 12,
  deductions: employee.salary / 12 * 0.15,
  netSalary: employee.salary / 12 * 0.85,
  generatedAt: '2026-08-31'
}));

const settings = [
  { id: 'setting-1', category: 'company', key: 'name', value: 'SambaPay Inc.', type: 'text' },
  { id: 'setting-2', category: 'company', key: 'address', value: '123 Business Ave, Suite 100', type: 'text' },
  { id: 'setting-3', category: 'company', key: 'contactEmail', value: 'hr@company.com', type: 'text' },
  { id: 'setting-4', category: 'company', key: 'currency', value: 'USD', type: 'text' },
  { id: 'setting-5', category: 'hr', key: 'leaveTypes', value: ['Annual Leave', 'Sick Leave', 'Unpaid Leave'], type: 'json' },
  { id: 'setting-6', category: 'payroll', key: 'schedule', value: 'Monthly', type: 'text' }
];

const notifications = [
  { id: 'notification-1', message: 'September payroll is ready for review.', read: false, createdAt: '2026-09-05T09:00:00.000Z' },
  { id: 'notification-2', message: 'Bob Jones submitted a time-off request.', read: false, createdAt: '2026-09-04T14:30:00.000Z' }
];

const users = [
  { id: 'demo-admin', name: 'Sarah Connor', email: 'sarah.connor@company.com', role: 'ADMIN', employeeId: null },
  { id: 'demo-hr', name: 'Evan Wright', email: 'evan.wright@company.com', role: 'HR_MANAGER', employeeId: null },
  { id: 'demo-payroll', name: 'Fiona Gallagher', email: 'fiona.gallagher@company.com', role: 'HR_PAYROLL_MANAGER', employeeId: null },
  { id: 'demo-employee', name: 'Alice Smith', email: 'alice.smith@company.com', role: 'EMPLOYEE', employeeId: null }
];

const reportRows = employees.map((employee) => ({
  employeeId: employee.id,
  employeeName: employee.name,
  department: employee.department,
  totalHours: 160,
  totalSalary: employee.salary,
  status: employee.status,
  count: 1
}));

export const getMockResponse = (endpoint, options = {}) => {
  const path = endpoint.split('?')[0];
  const method = options.method || 'GET';
  const id = path.split('/').pop();

  if (path === '/dashboard/stats') {
    return { totalEmployees: 8, activeEmployees: 8, onLeaveEmployees: 1, monthlyPayroll: 100000, attendanceToday: 5, presentToday: 4, pendingLeaves: 1, payrollTrend: [{ month: 'Apr', cost: 92000 }, { month: 'May', cost: 95000 }, { month: 'Jun', cost: 98000 }, { month: 'Jul', cost: 99000 }, { month: 'Aug', cost: 100000 }, { month: 'Sep', cost: 100000 }] };
  }
  if (path === '/employees') return method === 'GET' ? employees : { ...employees[0], ...(JSON.parse(options.body || '{}')), id: `emp-${Date.now()}` };
  if (path.startsWith('/employees/')) return employees.find((item) => item.id === id) || employees[0];
  if (path === '/contracts') return method === 'GET' ? contracts : { ...contracts[0], ...(JSON.parse(options.body || '{}')), id: `contract-${Date.now()}` };
  if (path.startsWith('/contracts/')) return contracts.find((item) => item.id === id) || contracts[0];
  if (path === '/attendance') return method === 'GET' ? attendance : { ...attendance[0], ...(JSON.parse(options.body || '{}')), id: `att-${Date.now()}` };
  if (path.startsWith('/attendance/')) return attendance[0];
  if (path === '/leave') return method === 'GET' ? leave : { ...leave[0], ...(JSON.parse(options.body || '{}')), id: `leave-${Date.now()}` };
  if (path.startsWith('/leave/')) return { ...leave[0], status: path.endsWith('reject') ? 'Rejected' : path.endsWith('approve') ? 'Approved' : 'Cancelled' };
  if (path === '/payroll') return method === 'GET' ? payroll : { ...payroll[1], ...(JSON.parse(options.body || '{}')), id: `payroll-${Date.now()}` };
  if (path.startsWith('/payroll/')) return payroll.find((item) => item.id === id) || payroll[1];
  if (path === '/payslips') return payslips;
  if (path.startsWith('/payslips/')) return payslips.find((item) => item.id === id) || payslips[0];
  if (path === '/notifications') return notifications;
  if (path.startsWith('/notifications/')) return notifications[0];
  if (path === '/auth/users') return users;
  if (path.startsWith('/auth/users/')) return users.find((item) => item.id === path.split('/')[3]) || users[0];
  if (path === '/settings') return method === 'GET' ? settings : settings;
  if (path.startsWith('/reports/')) return path.includes('department') ? [{ department: 'Engineering', count: 3 }, { department: 'Marketing', count: 2 }, { department: 'Finance', count: 2 }, { department: 'HR', count: 1 }] : reportRows;
  return null;
};
