import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import payrollRoutes from './routes/payroll.js';
import payslipRoutes from './routes/payslips.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import contractRoutes from './routes/contracts.js';
import notificationRoutes from './routes/notifications.js';
import salaryRoutes from './routes/salary.js';
import timeOffConfigRoutes from './routes/timeOffConfig.js';
import workingScheduleRoutes from './routes/workingSchedules.js';
import organizationRoutes from './routes/organizations.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { isStoreInstalled, installInMemoryStore, removeInMemoryStore } from './services/inMemoryStore.js';

dotenv.config();

connectDB();

const syncDataStore = () => {
  const connected = mongoose.connection.readyState === 1;
  if (connected && isStoreInstalled()) {
    removeInMemoryStore();
    console.log('[data] MongoDB connected — using native models');
  } else if (!connected && !isStoreInstalled()) {
    installInMemoryStore();
    console.log('[data] MongoDB unavailable — using seeded in-memory data store');
  }
};

mongoose.connection.on('connected', syncDataStore);
mongoose.connection.on('reconnected', syncDataStore);
mongoose.connection.on('disconnected', syncDataStore);
mongoose.connection.on('error', syncDataStore);
setTimeout(syncDataStore, 250);

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/leave', timeOffConfigRoutes);
app.use('/api/working-schedules', workingScheduleRoutes);
app.use('/api/organizations', organizationRoutes);

app.get('/api/health', (req, res) => {
	const databaseReady = mongoose.connection.readyState === 1;
	res.status(200).json({
		status: databaseReady ? 'ok' : 'degraded',
		database: databaseReady ? 'connected' : 'in-memory-fallback',
		instanceId: process.env.SERVER_INSTANCE_ID || 'unknown',
		uptimeSec: Math.round(process.uptime()),
		timestamp: new Date()
	});
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Duplicate-instance guard.
// On Windows two processes can sometimes bind the same port silently, which
// gives every process its own random in-memory seed (IDs never match across
// requests). Detect an already-running API and abort instead.
// ---------------------------------------------------------------------------
const probeExistingInstance = async () => {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 1200);
		const response = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: controller.signal });
		clearTimeout(timer);
		return response.ok;
	} catch {
		return false;
	}
};

const start = async () => {
	if (await probeExistingInstance()) {
		console.error(`\n[abort] An API instance is ALREADY running on port ${PORT}.`);
		console.error('        Stop it first (or kill node.exe) — running two instances would');
		console.error('        split the in-memory data store and break writes.\n');
		process.exit(1);
	}

	const listener = app.listen(PORT, () => {
		process.env.SERVER_INSTANCE_ID = Math.random().toString(36).slice(2, 10);
		console.log(`Server running on port ${PORT} (instance ${process.env.SERVER_INSTANCE_ID})`);
	});

	listener.on('error', (err) => {
		if (err.code === 'EADDRINUSE') {
			console.error(`[abort] Port ${PORT} is in use by another process.`);
			process.exit(1);
		}
		throw err;
	});
};

start();
