import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client'; // still needed for signToken type
import { prisma } from '../prisma/client';
import { config } from '../config/env';
import { AppError, ErrorCode } from '../types/errors';

const SALT_ROUNDS = 12;

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already in use', 409, ErrorCode.EMAIL_TAKEN);
  }

  const allowed = await prisma.allowedEmail.findUnique({ where: { email: data.email } });
  if (!allowed) {
    throw new AppError('Email not authorized to register', 403, ErrorCode.FORBIDDEN);
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: allowed.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = signToken(user);
  return { user, token };
}

export async function login(data: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  const { passwordHash: _, ...safeUser } = user;
  const token = signToken(safeUser);
  return { user: safeUser, token };
}

function signToken(user: { id: number; email: string; role: Role }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );
}
