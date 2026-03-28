import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

// Uses the same secret set in tests/setup.ts — must match what authMiddleware reads.
const SECRET = process.env.JWT_SECRET!;

export function managerToken(): string {
  return jwt.sign({ id: 1, email: 'manager@test.com', role: Role.MANAGER }, SECRET, { expiresIn: '1h' });
}

export function workerToken(): string {
  return jwt.sign({ id: 2, email: 'worker@test.com', role: Role.WORKER }, SECRET, { expiresIn: '1h' });
}
