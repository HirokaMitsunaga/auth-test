import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

type BetterAuthDatabase = Parameters<typeof prismaAdapter>[0];

export const createBetterAuth = (database: BetterAuthDatabase) => {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_SECRET, BETTER_AUTH_URL, are required');
  }

  return betterAuth({
    database: prismaAdapter(database, {
      provider: 'postgresql',
      transaction: true,
    }),
    user: {
      modelName: 'AuthUser',
    },
    session: {
      modelName: 'AuthSession',
    },
    account: {
      modelName: 'AuthAccount',
    },
    verification: {
      modelName: 'AuthVerification',
    },
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/auth',
    secret: process.env.BETTER_AUTH_SECRET,
  });
};
