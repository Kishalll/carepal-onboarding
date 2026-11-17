import { PrismaClient } from '@prisma/client';

const isNode = typeof window === 'undefined';

const globalForPrisma =
  typeof globalThis !== 'undefined'
    ? (globalThis as unknown as { prisma?: PrismaClient })
    : {};

export const prisma = isNode
  ? globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  : (null as unknown as PrismaClient);

if (isNode && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
