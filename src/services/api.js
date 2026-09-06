const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('samba_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const request = async (endpoint, options = {}) => {
  let url = `${API_URL}${endpoint}`;

  if (options.params) {
    const validParams = Object.fromEntries(Object.entries(options.params).filter(([_, v]) => v != null && v !== ''));
    const query = new URLSearchParams(validParams).toString();
    if (query) {
      url += `?${query}`;
    }
  }

  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };
  delete config.params;

  const controller = new AbortController();
  const timeout = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  config.signal = controller.signal;

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    clearTimeout(timeoutId);
    const networkError = new Error('Unable to reach SambaPay services. Please make sure the backend is running and try again.');
    networkError.cause = error;
    throw networkError;
  }
  clearTimeout(timeoutId);

  if (response.status === 401) {
    localStorage.removeItem('samba_token');
    localStorage.removeItem('samba_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errMsg = 'Something went wrong';
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        errMsg = parsed.message || errMsg;
      } catch (e) {
        errMsg = data || errMsg;
      }
    } else if (data && data.message) {
      errMsg = data.message;
    }

    const error = new Error(errMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const authAPI = {
  login: async (email, password) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  register: async (name, email, password, role) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
  },
  forgotPassword: async (email) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  resetPassword: async (token, password) => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },
  getMe: async () => {
    return request('/auth/me');
  },
  getUsers: async () => {
    return request('/auth/users');
  },
  updateUserRole: async (id, role) => {
    return request(`/auth/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }
};

export const employeesAPI = {
  getEmployees: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/employees${query ? `?${query}` : ''}`);
  },
  getEmployee: async (id) => {
    return request(`/employees/${id}`);
  },
  createEmployee: async (data) => {
    return request('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateEmployee: async (id, data) => {
    return request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteEmployee: async (id) => {
    return request(`/employees/${id}`, {
      method: 'DELETE'
    });
  }
};

export const contractsAPI = {
  getContracts: async () => {
    return request('/contracts');
  },
  getContract: async (id) => {
    return request(`/contracts/${id}`);
  },
  createContract: async (data) => {
    return request('/contracts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

export const attendanceAPI = {
  getAttendance: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance${query ? `?${query}` : ''}`);
  },
  createAttendance: async (data) => {
    return request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateAttendance: async (id, data) => {
    return request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export const leaveAPI = {
  getLeaveRequests: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leave${query ? `?${query}` : ''}`);
  },
  createLeaveRequest: async (data) => {
    return request('/leave', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  approveLeave: async (id) => {
    return request(`/leave/${id}/approve`, { method: 'PUT' });
  },
  rejectLeave: async (id) => {
    return request(`/leave/${id}/reject`, { method: 'PUT' });
  },
  cancelLeave: async (id) => {
    return request(`/leave/${id}/cancel`, { method: 'PUT' });
  }
};

export const payrollAPI = {
  getPayroll: async () => {
    return request('/payroll');
  },
  getPayrun: async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Payrun ID is required to load a payrun.');
    }
    return request(`/payroll/${id}`);
  },
  createPayrun: async (data) => {
    return request('/payroll', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  calculatePayrun: async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Payrun ID is required to calculate payroll.');
    }
    return request(`/payroll/${id}/calculate`, { method: 'POST' });
  },
  approvePayrun: async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Payrun ID is required to approve payroll.');
    }
    return request(`/payroll/${id}/approve`, { method: 'PUT' });
  },
  processPayrun: async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Payrun ID is required to process payroll.');
    }
    return request(`/payroll/${id}/process`, { method: 'POST' });
  }
};

export const payslipsAPI = {
  getPayslips: async () => {
    return request('/payslips');
  },
  getPayslip: async (id) => {
    return request(`/payslips/${id}`);
  },
  downloadPayslip: async (id) => {
    return request(`/payslips/${id}/download`);
  }
};

export const notificationsAPI = {
  getNotifications: async () => {
    return request('/notifications');
  },
  createNotification: async (data) => {
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  markAsRead: async (id) => {
    return request(`/notifications/${id}/read`, { method: 'PUT' });
  },
  markAllAsRead: async () => {
    return request('/notifications/read-all', { method: 'PUT' });
  }
};

export const timeOffConfigAPI = {
  getTypes: async () => {
    return request('/leave/types');
  },
  createType: async (data) => {
    return request('/leave/types', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateType: async (id, data) => {
    return request(`/leave/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  getAllocations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leave/allocations${query ? `?${query}` : ''}`);
  },
  createAllocation: async (data) => {
    return request('/leave/allocations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  approveAllocation: async (id) => {
    return request(`/leave/allocations/${id}/approve`, { method: 'PUT' });
  }
};

export const workingSchedulesAPI = {
  getSchedules: async () => {
    return request('/working-schedules');
  },
  createSchedule: async (data) => {
    return request('/working-schedules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateSchedule: async (id, data) => {
    return request(`/working-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export const salaryAPI = {
  getRules: async () => {
    return request('/salary/rules');
  },
  createRule: async (data) => {
    return request('/salary/rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateRule: async (id, data) => {
    return request(`/salary/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  getStructures: async () => {
    return request('/salary/structures');
  },
  createStructure: async (data) => {
    return request('/salary/structures', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateStructure: async (id, data) => {
    return request(`/salary/structures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export const reportsAPI = {
  getEmployeeReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/employees${query ? `?${query}` : ''}`);
  },
  getAttendanceReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/attendance${query ? `?${query}` : ''}`);
  },
  getPayrollReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/payroll${query ? `?${query}` : ''}`);
  },
  getLeaveReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/leave${query ? `?${query}` : ''}`);
  },
  getSalaryReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/salary${query ? `?${query}` : ''}`);
  },
  getDepartmentReport: async () => {
    return request(`/reports/department`);
  },
  getTaxReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/tax${query ? `?${query}` : ''}`);
  }
};

export const settingsAPI = {
  getSettings: async (category) => {
    return request('/settings', { params: { category } });
  },
  updateSetting: async (data) => {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export const organizationsAPI = {
  getMine: async () => request('/organizations/me'),
  search: async (search = '') => request('/organizations', { params: { search } }),
  create: async (data) => request('/organizations', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  requestToJoin: async (data) => request('/organizations/join-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getJoinRequests: async () => request('/organizations/join-requests'),
  reviewJoinRequest: async (id, action) => request(`/organizations/join-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ action })
  })
};

export const dashboardAPI = {
  getStats: async () => {
    return request('/dashboard/stats');
  }
};

export default request;
