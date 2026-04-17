import { Router } from 'express';
import { requireManager } from '../middleware/auth';
import {
  getRoles,
  getRolesWithTemplates,
  createRole,
  renameRole,
  deleteRole,
  getTemplates,
  createTemplate,
  toggleTemplate,
  deleteTemplate,
} from '../controllers/roles.controller';

export const router = Router();

router.get('/with-templates', requireManager, getRolesWithTemplates);
router.get('/', requireManager, getRoles);
router.post('/', requireManager, createRole);
router.patch('/:id', requireManager, renameRole);
router.delete('/:id', requireManager, deleteRole);

router.get('/:roleId/templates', requireManager, getTemplates);
router.post('/:roleId/templates', requireManager, createTemplate);
router.patch('/:roleId/templates/:id', requireManager, toggleTemplate);
router.delete('/:roleId/templates/:id', requireManager, deleteTemplate);
