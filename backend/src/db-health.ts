import type { PrismaClient } from '@prisma/client';

type DbHealthResult = {
  ok: boolean;
  result: number;
};

export const checkDbHealth = async (
  prisma: Pick<PrismaClient, '$queryRaw'>,
): Promise<DbHealthResult> => {
  const rows = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 AS result`;

  return {
    ok: rows[0]?.result === 1,
    result: rows[0]?.result ?? 0,
  };
};
