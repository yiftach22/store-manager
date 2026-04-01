import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import * as orderController from '../controllers/order.controller';

export const router = Router();

router.get('/week', orderController.getWeek);
router.get('/', orderController.getInstances);
router.get('/lists', orderController.getLists);
router.post('/lists', requireManager, orderController.createList);
router.patch('/lists/:id', requireManager, orderController.renameList);
router.delete('/lists/:id', requireManager, orderController.deleteList);
router.get('/templates', requireManager, orderController.getTemplates);
router.post('/templates', requireManager, orderController.createTemplate);
router.patch('/templates/:id/toggle', requireManager, orderController.toggleTemplate);
router.post('/instances', requireManager, orderController.createInstance);
router.patch('/instances/:id/toggle', orderController.toggleInstance);
router.post('/sync', requireManager, orderController.syncOrders);
