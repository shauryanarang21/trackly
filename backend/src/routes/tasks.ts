import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireProjectAdmin, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(authenticate);

const sp = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
});

const assertMember = async (projectId: string, userId: string): Promise<boolean> => {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!m;
};

const taskInclude = {
  assignees: { include: { user: { select: { id: true, email: true, name: true } } } },
  createdBy: { select: { id: true, email: true, name: true } },
};

// List tasks
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = sp(req.params['projectId']);
  if (!(await assertMember(projectId, req.user!.id))) {
    res.status(403).json({ error: 'Not a member' });
    return;
  }

  const status = req.query['status'] as string | undefined;
  const priority = req.query['priority'] as string | undefined;
  const assigneeId = req.query['assigneeId'] as string | undefined;

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assigneeId ? { assignees: { some: { userId: assigneeId } } } : {}),
    },
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.json(tasks);
});

// Create task
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = sp(req.params['projectId']);
  if (!(await assertMember(projectId, req.user!.id))) {
    res.status(403).json({ error: 'Not a member' });
    return;
  }

  try {
    const data = taskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status ?? 'TODO',
        priority: data.priority ?? 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId,
        createdById: req.user!.id,
        assignees: data.assigneeIds?.length
          ? { create: data.assigneeIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: taskInclude,
    });
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
router.put('/:taskId', async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = sp(req.params['projectId']);
  const taskId = sp(req.params['taskId']);
  if (!(await assertMember(projectId, req.user!.id))) {
    res.status(403).json({ error: 'Not a member' });
    return;
  }

  try {
    const data = taskSchema.partial().parse(req.body);

    // Replace all assignees if provided
    if (data.assigneeIds !== undefined) {
      await prisma.taskAssignee.deleteMany({ where: { taskId } });
      if (data.assigneeIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: data.assigneeIds.map((userId) => ({ taskId, userId })),
        });
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
          : {}),
      },
      include: taskInclude,
    });
    res.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task (ADMIN only)
router.delete('/:taskId', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.task.delete({ where: { id: sp(req.params['taskId']) } });
  res.json({ message: 'Task deleted' });
});

export default router;
