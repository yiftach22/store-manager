import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import { getUsers, getAllowedEmails, addAllowedEmail, removeAllowedEmail } from '../controllers/users.controller';

export const router = Router();

router.get('/', requireManager, getUsers);
router.get('/allowed-emails', requireManager, getAllowedEmails);
router.post('/allowed-emails', requireManager, addAllowedEmail);
router.delete('/allowed-emails/:id', requireManager, removeAllowedEmail);
