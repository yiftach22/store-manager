import { Router } from 'express';
import { router as ordersRouter } from './orders';
import { router as usersRouter } from './users';
import { router as rolesRouter } from './roles';
import { router as tasksRouter } from './tasks';

export const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/orders', ordersRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/tasks', tasksRouter);
