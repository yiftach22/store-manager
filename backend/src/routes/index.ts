import { Router } from 'express';
import { router as ordersRouter } from './orders';

export const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/orders', ordersRouter);
