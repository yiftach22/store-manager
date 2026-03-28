import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError, ErrorCode } from '../types/errors';
import * as orderController from '../controllers/order.controller';

export const router = Router();

function requireManager(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== Role.MANAGER) {
    return next(new AppError('Forbidden', 403, ErrorCode.FORBIDDEN));
  }
  next();
}

router.get('/', orderController.getInstances);
router.get('/templates', requireManager, orderController.getTemplates);
router.post('/templates', requireManager, orderController.createTemplate);
router.patch('/templates/:id/toggle', requireManager, orderController.toggleTemplate);
router.patch('/instances/:id/toggle', orderController.toggleInstance);
router.post('/sync', requireManager, orderController.syncOrders);
