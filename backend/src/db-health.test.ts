import { describe, expect, it, vi } from 'vitest';

import { checkDbHealth } from './db-health.js';

describe('checkDbHealth', () => {
  it('returns true when Prisma can query the database', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    };

    await expect(checkDbHealth(prisma)).resolves.toEqual({
      ok: true,
      result: 1,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});
