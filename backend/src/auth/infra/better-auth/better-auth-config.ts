import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { clearAccountTokenFields } from './hooks/account-token-policy.js';

type BetterAuthDatabase = Parameters<typeof prismaAdapter>[0];

// Better Auth のアプリケーションセッションの有効期限を 7 日に設定する。
const AUTH_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
// セッションを利用したとき、期限を延長する最小間隔を 1 日に設定する。
const AUTH_SESSION_UPDATE_AGE_IN_SECONDS = 60 * 60 * 24;

const AUTH_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

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
      expiresIn: AUTH_SESSION_EXPIRES_IN_SECONDS,
      updateAge: AUTH_SESSION_UPDATE_AGE_IN_SECONDS,
    },
    account: {
      modelName: 'AuthAccount',
      updateAccountOnSignIn: false,
      storeAccountCookie: false,
    },
    verification: {
      modelName: 'AuthVerification',
    },
    advanced: {
      // Cookie names already use the __Host- prefix. Avoid adding __Secure-
      // in front of them while keeping Secure explicitly enabled below.
      useSecureCookies: false,
      cookiePrefix: '__Host-auth',
      defaultCookieAttributes: AUTH_COOKIE_ATTRIBUTES,
      cookies: {
        session_token: {
          name: '__Host-session',
          attributes: {
            ...AUTH_COOKIE_ATTRIBUTES,
            maxAge: AUTH_SESSION_EXPIRES_IN_SECONDS,
          },
        },
      },
    },
    databaseHooks: {
      account: {
        create: {
          before: clearAccountTokenFields,
        },
        update: {
          before: clearAccountTokenFields,
        },
      },
    },
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/auth',
    secret: process.env.BETTER_AUTH_SECRET,
  });
};
