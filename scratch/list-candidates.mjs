import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: {
      id: true,
      applicationId: true,
      fullName: true,
      email: true,
      preferredLanguage: true,
      stage: true,
    },
    take: 15,
  });
  console.log('Candidates in DB:');
  console.table(candidates);
}

main().finally(() => prisma.$disconnect());
