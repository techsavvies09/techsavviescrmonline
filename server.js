import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedInitialData } from './seedData.js';

import authRoutes from './routes/auth.js';
import mastersRoutes from './routes/masters.js';
import issuesRoutes from './routes/issues.js';
import callsRoutes from './routes/calls.js';
import attendanceRoutes from './routes/attendance.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import bulletinsRoutes from './routes/bulletins.js';
import leavesRoutes from './routes/leaves.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database & Seed default Admin
await seedInitialData();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/bulletins', bulletinsRoutes);
app.use('/api/leaves', leavesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Tech Savvies Customer Issue & Daily Call Records CRM',
    time: new Date().toISOString()
  });
});

// Serve frontend static files in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal error occurred.' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Tech Savvies Issue & Daily Call Records Server Ready! `);
  console.log(` Listening on: http://localhost:${PORT}                 `);
  console.log(` Default Admin: ADMIN | Password: Admin@123            `);
  console.log(`=======================================================`);
});
