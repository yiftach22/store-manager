import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

// This file is used automatically when jest.mock('../../src/prisma/client') is called.
// Every method (findMany, create, update, etc.) becomes a jest.fn() with full type safety.
export const prisma = mockDeep<PrismaClient>();
