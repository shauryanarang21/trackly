import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const now = new Date();

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  const [myTasks, allTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        assignees: { some: { userId } },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
    }),
  ]);

  const overdue = myTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.status !== 'DONE'
  );

  const statusCounts = {
    TODO: allTasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: allTasks.filter((t) => t.status === 'DONE').length,
  };

  const priorityCounts = {
    LOW: allTasks.filter((t) => t.priority === 'LOW').length,
    MEDIUM: allTasks.filter((t) => t.priority === 'MEDIUM').length,
    HIGH: allTasks.filter((t) => t.priority === 'HIGH').length,
  };

  res.json({
    totalProjects: projectIds.length,
    totalTasks: allTasks.length,
    myTasksCount: myTasks.length,
    overdueCount: overdue.length,
    statusCounts,
    priorityCounts,
    recentTasks: myTasks.slice(0, 5),
    overdueTasks: overdue.slice(0, 5),
  });
});

export default router;
