import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
