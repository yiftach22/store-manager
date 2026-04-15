import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import { getTaskStatus, getMyTasks, syncTasks, toggleInstance } from '../controllers/tasks.controller';

export const router = Router();

router.get('/status', requireManager, getTaskStatus);
router.post('/sync', requireManager, syncTasks);
router.get('/my-tasks', getMyTasks);
router.patch('/instances/:id/toggle', toggleInstance);
