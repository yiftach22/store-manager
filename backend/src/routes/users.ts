import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import { getUsers, getUsersManagement, getAllowedEmails, addAllowedEmail, removeAllowedEmail, assignRole, setAuthRole, resetPassword } from '../controllers/users.controller';

export const router = Router();

router.get('/management', requireManager, getUsersManagement);
router.get('/', requireManager, getUsers);
router.get('/allowed-emails', requireManager, getAllowedEmails);
router.post('/allowed-emails', requireManager, addAllowedEmail);
router.delete('/allowed-emails/:id', requireManager, removeAllowedEmail);
router.patch('/:id/auth-role', requireManager, setAuthRole);
router.patch('/:id/role', requireManager, assignRole);
router.patch('/:id/password', requireManager, resetPassword);
