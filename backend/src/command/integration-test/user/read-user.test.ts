import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ulid } from 'ulid';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('read-user', () => {
  let userId: string;

  beforeEach(async () => {
    userId = ulid();
    await prisma.user.create({
      data: {
        id: userId,
        name: '取得対象ユーザー',
        email: `${userId}@example.com`,
        password: 'password',
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】Userをオブジェクトの配列で取得する', async () => {
    const response = await createApp(prisma).request('/users');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        {
          id: userId,
          name: '取得対象ユーザー',
          email: `${userId}@example.com`,
        },
      ]),
    );
  });

  // PostgreSQLにはSELECTトリガーがないため、テーブル名を一時的に変更して取得エラーを再現する
  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "User" RENAME TO "UserForReadError";',
    );

    try {
      const response = await createApp(prisma).request('/users');

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        message: 'Internal Server Error',
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "UserForReadError" RENAME TO "User";',
      );
    }
  });
});
