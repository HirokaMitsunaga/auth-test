import { afterAll, describe, expect, it } from 'vitest';
import { parseSetCookieHeader } from 'better-auth/cookies';
import { ulid } from 'ulid';

import { createBetterAuth } from '../infra/better-auth/better-auth-config.js';
import { prisma } from '../../prisma.js';

process.env.BETTER_AUTH_SECRET ??=
  '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.LINE_CLIENT_ID ??= 'line-test-client-id';
process.env.LINE_CLIENT_SECRET ??= 'line-test-client-secret';
process.env.LINE_REDIRECT_URI ??= 'http://localhost:3000/auth/callback/line';

describe('Better Auth セキュリティポリシー', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】セッションCookieの属性を固定して返す', async () => {
    const auth = createBetterAuth(prisma);
    const context = await auth.$context;
    const sessionCookie = context.authCookies.sessionToken;
    const stateCookie = context.createAuthCookie('state', { maxAge: 300 });

    expect(context.sessionConfig).toMatchObject({
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    });
    expect(sessionCookie).toEqual({
      name: '__Host-session',
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      },
    });
    expect(sessionCookie.attributes).not.toHaveProperty('domain');
    expect(stateCookie).toEqual({
      name: '__Host-auth.state',
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300,
      },
    });
    expect(stateCookie.attributes).not.toHaveProperty('domain');

    const response = await auth.handler(
      new Request('http://localhost:3000/auth/sign-out', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
        },
        body: '{}',
      }),
    );
    const cookies = parseSetCookieHeader(
      response.headers.get('set-cookie') ?? '',
    );
    const deletedSessionCookie = cookies.get('__Host-session');

    expect(response.status).toBe(200);
    expect(deletedSessionCookie).toMatchObject({
      'max-age': 0,
      path: '/',
      httponly: true,
      secure: true,
      samesite: 'lax',
    });
    expect(deletedSessionCookie).not.toHaveProperty('domain');
  });

  it('【正常系】accountのprovider tokenを作成時と更新時に保存しない', async () => {
    const auth = createBetterAuth(prisma);
    const context = await auth.$context;
    const userId = `auth-user-${ulid()}`;
    const accountId = `auth-account-${ulid()}`;

    await prisma.authUser.create({
      data: {
        id: userId,
        name: 'Security Test User',
        email: `${userId}@example.com`,
      },
    });

    try {
      await context.internalAdapter.createAccount({
        id: accountId,
        userId,
        providerId: 'security-test',
        issuer: 'https://issuer.example.com',
        accountId: `provider-${ulid()}`,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        accessTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
        refreshTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
        scope: 'openid profile',
      });

      const createdAccount = await prisma.authAccount.findUnique({
        where: { id: accountId },
      });

      expect(createdAccount).toMatchObject({
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
      });

      await prisma.authAccount.update({
        where: { id: accountId },
        data: {
          accessToken: 'legacy-access-token',
          refreshToken: 'legacy-refresh-token',
          idToken: 'legacy-id-token',
          accessTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
          refreshTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
          scope: 'openid',
        },
      });

      await context.internalAdapter.updateAccount(accountId, {
        accessToken: 'updated-access-token',
        refreshToken: 'updated-refresh-token',
        idToken: 'updated-id-token',
        accessTokenExpiresAt: new Date('2031-01-01T00:00:00.000Z'),
        refreshTokenExpiresAt: new Date('2031-01-01T00:00:00.000Z'),
        scope: 'openid email',
      });

      const updatedAccount = await prisma.authAccount.findUnique({
        where: { id: accountId },
      });

      expect(updatedAccount).toMatchObject({
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
      });
    } finally {
      await prisma.authUser.delete({ where: { id: userId } });
    }
  });
});
