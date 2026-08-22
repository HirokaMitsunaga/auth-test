import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ulid } from 'ulid';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('delete-user', () => {
  let userId: string;

  beforeEach(async () => {
    userId = ulid();
    await prisma.user.create({
      data: {
        id: userId,
        name: '削除対象ユーザー',
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

  it('【正常系】Userを削除してDBから削除する', async () => {
    const response = await createApp(prisma).request(`/users/${userId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
    await expect(
      prisma.user.findUnique({ where: { id: userId } }),
    ).resolves.toBeNull();
  });

  it('【異常系】存在しないUserを削除しようとすると404とエラー形式を返す', async () => {
    const missingUserId = ulid();

    const response = await createApp(prisma).request(
      `/users/${missingUserId}`,
      { method: 'DELETE' },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: `User: ${missingUserId} not found`,
    });
  });

  it('【異常系】不正なUser IDを指定すると400とエラー形式を返す', async () => {
    const response = await createApp(prisma).request('/users/invalid-id', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Invalid ID format: invalid-id',
    });
  });

  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION raise_delete_user_error()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.id = '${userId}' THEN
          RAISE EXCEPTION 'Intentional delete error';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER delete_user_error_trigger
      BEFORE DELETE ON "User"
      FOR EACH ROW EXECUTE FUNCTION raise_delete_user_error();
    `);

    try {
      const response = await createApp(prisma).request(`/users/${userId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        message: 'Internal Server Error',
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS delete_user_error_trigger ON "User";',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS raise_delete_user_error();',
      );
    }
  });
});
