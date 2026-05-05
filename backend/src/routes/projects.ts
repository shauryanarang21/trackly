import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireProjectAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const sp = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// List projects the user belongs to
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user!.id },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
          members: {
            where: { userId: req.user!.id },
            select: { role: true },
          },
        },
      },
    },
  });

  const projects = memberships.map((m: (typeof memberships)[0]) => ({
    ...m.project,
    myRole: m.project.members[0]?.role ?? 'MEMBER',
  }));

  res.json(projects);
});

// Create project — creator becomes ADMIN
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name,
        description,
        createdById: req.user!.id,
        members: {
          create: { userId: req.user!.id, role: 'ADMIN' },
        },
      },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    res.status(201).json({ ...project, myRole: 'ADMIN' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = sp(req.params['id']);
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: req.user!.id } },
  });
  if (!membership) {
    res.status(403).json({ error: 'Not a member of this project' });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ ...project, myRole: membership.role });
});

// Update project (ADMIN only)
router.put('/:id', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = sp(req.params['id']);
    const { name, description } = projectSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id },
      data: { name, description },
    });
    res.json(project);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project (ADMIN only)
router.delete('/:id', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.project.delete({ where: { id: sp(req.params['id']) } });
  res.json({ message: 'Project deleted' });
});

// List members
router.get('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = sp(req.params['id']);
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: req.user!.id } },
  });
  if (!membership) {
    res.status(403).json({ error: 'Not a member' });
    return;
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.json(members);
});

// Add member (ADMIN only)
router.post('/:id/members', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = sp(req.params['id']);
  try {
    const { email, role } = memberSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: user.id } },
    });
    if (existing) {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: user.id, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.status(201).json(member);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update member role (ADMIN only)
router.patch('/:id/members/:userId', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = sp(req.params['id']);
  const userId = sp(req.params['userId']);
  const { role } = z.object({ role: z.enum(['ADMIN', 'MEMBER']) }).parse(req.body);
  const member = await prisma.projectMember.update({
    where: { projectId_userId: { projectId: id, userId } },
    data: { role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.json(member);
});

// Remove member (ADMIN only)
router.delete('/:id/members/:userId', requireProjectAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = sp(req.params['id']);
  const userId = sp(req.params['userId']);
  if (userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot remove yourself' });
    return;
  }
  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: id, userId } },
  });
  res.json({ message: 'Member removed' });
});

export default router;
