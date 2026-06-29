import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/users - List organization users
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.json([]);
      return;
    }

    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /api/users - Invite user to organization
router.post('/', authorize('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!currentUser?.organizationId) {
      res.status(400).json({ error: 'Usuário não pertence a uma organização' });
      return;
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'ATTENDANT',
        organizationId: currentUser.organizationId,
      },
    });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id - Update user role
router.put('/:id', authorize('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id - Remove user from organization
router.delete('/:id', authorize('OWNER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Usuário removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

export default router;
