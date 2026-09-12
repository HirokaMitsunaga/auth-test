import { afterAll, describe, expect, it } from 'vitest';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
}

const { prisma } = await import('../../prisma.js');

const betterAuthTables = [
  'AuthUser',
  'AuthAccount',
  'AuthSession',
  'AuthVerification',
] as const;

describe('Better Auth スキーマ', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each(betterAuthTables)(
    '【正常系】%sテーブルが作成されている',
    async (tableName) => {
      const tables = await prisma.$queryRaw<Array<{ tableName: string }>>`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      `;

      expect(tables).toEqual([{ tableName }]);
    },
  );

  it('【正常系】既存Userテーブルが変更されていない', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ columnName: string; isNullable: string }>
    >`
      SELECT column_name AS "columnName", is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name IN ('emailVerified', 'image', 'password')
      ORDER BY column_name
    `;

    expect(columns).toEqual([{ columnName: 'password', isNullable: 'NO' }]);
  });

  it('【正常系】AuthUser.emailをNULLで保存できる', async () => {
    const columns = await prisma.$queryRaw<Array<{ isNullable: string }>>`
      SELECT is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AuthUser'
        AND column_name = 'email'
    `;

    expect(columns).toEqual([{ isNullable: 'YES' }]);
  });
});
