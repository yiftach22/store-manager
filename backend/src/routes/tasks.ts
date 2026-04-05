import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import { getTaskStatus, toggleInstance } from '../controllers/tasks.controller';

export const router = Router();

router.get('/status', requireManager, getTaskStatus);
router.patch('/instances/:id/toggle', toggleInstance);
