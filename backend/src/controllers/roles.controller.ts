import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

// GET /api/roles/with-templates
export async function getRolesWithTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await prisma.jobRole.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        templates: { orderBy: { id: 'asc' } },
      },
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
}

// GET /api/roles
export async function getRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await prisma.jobRole.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
}

// POST /api/roles
export async function createRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return next(new AppError('name is required', 400, ErrorCode.VALIDATION_ERROR));
    }
    const role = await prisma.jobRole.create({ data: { name: name.trim() } });
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/roles/:id
export async function renameRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return next(new AppError('name is required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const role = await prisma.jobRole.findUnique({ where: { id } });
    if (!role) return next(new AppError('Role not found', 404, ErrorCode.NOT_FOUND));

    const updated = await prisma.jobRole.update({ where: { id }, data: { name: name.trim() } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/roles/:id
export async function deleteRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const role = await prisma.jobRole.findUnique({ where: { id } });
    if (!role) return next(new AppError('Role not found', 404, ErrorCode.NOT_FOUND));

    await prisma.jobRole.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/roles/:roleId/templates
export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const roleId = parseInt(req.params.roleId, 10);
    if (isNaN(roleId)) return next(new AppError('Invalid roleId', 400, ErrorCode.VALIDATION_ERROR));

    const templates = await prisma.taskTemplate.findMany({
      where: { roleId },
      orderBy: { id: 'asc' },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

// POST /api/roles/:roleId/templates
export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const roleId = parseInt(req.params.roleId, 10);
    if (isNaN(roleId)) return next(new AppError('Invalid roleId', 400, ErrorCode.VALIDATION_ERROR));

    const { title, frequency } = req.body as { title?: string; frequency?: string };
    if (!title?.trim()) {
      return next(new AppError('title is required', 400, ErrorCode.VALIDATION_ERROR));
    }
    if (frequency !== 'daily' && frequency !== 'weekly') {
      return next(new AppError('frequency must be daily or weekly', 400, ErrorCode.VALIDATION_ERROR));
    }

    const role = await prisma.jobRole.findUnique({ where: { id: roleId } });
    if (!role) return next(new AppError('Role not found', 404, ErrorCode.NOT_FOUND));

    const template = await prisma.taskTemplate.create({
      data: { title: title.trim(), frequency, roleId },
    });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/roles/:roleId/templates/:id  — toggle isActive
export async function toggleTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const template = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!template) return next(new AppError('Template not found', 404, ErrorCode.NOT_FOUND));

    const updated = await prisma.taskTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/roles/:roleId/templates/:id
export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const template = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!template) return next(new AppError('Template not found', 404, ErrorCode.NOT_FOUND));

    await prisma.taskTemplate.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
