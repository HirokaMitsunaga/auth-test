import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { parseSetCookieHeader } from 'better-auth/cookies';
import { ulid } from 'ulid';

import { createTestApp } from './create-test-app.js';
import { prisma } from '../../prisma.js';

const lineClientId = 'line-test-client-id';
const lineRedirectURI = 'http://localhost:3000/auth/callback/line';
const lineEmail = `line-${ulid()}@example.com`.toLowerCase();

type LineClaims = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  name?: string;
  picture?: string;
  email?: string;
};

const lineClaims: LineClaims = {
  iss: 'https://access.line.me',
  sub: `line-sub-${ulid()}`,
  aud: lineClientId,
  exp: Math.floor(Date.now() / 1000) + 300,
  iat: Math.floor(Date.now() / 1000),
  name: 'LINE Test User',
  email: lineEmail,
};

let verificationClaims: LineClaims = lineClaims;
let verificationStatus = 200;
let tokenExchangeRequests: URLSearchParams[] = [];
let testStateIdentifiers: string[] = [];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const installLineProvider = () => {
  vi.stubGlobal(
    'fetch',
    (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      const requestBody = new URLSearchParams(
        typeof init?.body === 'string'
          ? init.body
          : init?.body instanceof URLSearchParams
            ? init.body.toString()
            : '',
      );

      if (url === 'https://api.line.me/oauth2/v2.1/token') {
        tokenExchangeRequests.push(requestBody);
        return jsonResponse({
          access_token: 'line-access-token',
          refresh_token: 'line-refresh-token',
          id_token: 'line-id-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token_expires_in: 86400,
          scope: 'openid profile email',
        });
      }

      if (url === 'https://api.line.me/oauth2/v2.1/verify') {
        const nonce = requestBody.get('nonce') ?? undefined;
        return jsonResponse(
          {
            ...verificationClaims,
            nonce: verificationClaims.nonce ?? nonce,
          },
          verificationStatus,
        );
      }

      throw new Error(`Unexpected external request: ${url}`);
    },
  );
};

const getCookie = (setCookie: string, name: string) => {
  const cookie = parseSetCookieHeader(setCookie).get(name);
  if (!cookie) throw new Error(`${name} was not set`);
  return cookie;
};

const startLineLogin = async (app: ReturnType<typeof createTestApp>) => {
  const response = await app.request(
    'http://localhost:3000/auth/sign-in/social',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'line',
        callbackURL: 'http://localhost:3000/auth/login-complete',
        errorCallbackURL: 'http://localhost:3000/auth/login-error',
      }),
    },
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as { url: string; redirect: boolean };
  const authorizationURL = new URL(body.url);
  const state = authorizationURL.searchParams.get('state');
  const nonce = authorizationURL.searchParams.get('nonce');

  expect(body.redirect).toBe(true);
  expect(authorizationURL.origin).toBe('https://access.line.me');
  expect(authorizationURL.pathname).toBe('/oauth2/v2.1/authorize');
  expect(authorizationURL.searchParams.get('client_id')).toBe(lineClientId);
  expect(authorizationURL.searchParams.get('redirect_uri')).toBe(
    lineRedirectURI,
  );
  expect(authorizationURL.searchParams.get('response_type')).toBe('code');
  expect(authorizationURL.searchParams.get('scope')).toBe(
    'openid profile email',
  );
  expect(authorizationURL.searchParams.get('code_challenge')).toBeTruthy();
  expect(authorizationURL.searchParams.get('code_challenge_method')).toBe(
    'S256',
  );
  expect(state).toBeTruthy();
  expect(nonce).toBeTruthy();

  const stateCookie = getCookie(
    response.headers.get('set-cookie') ?? '',
    '__Host-auth.state',
  );
  testStateIdentifiers.push(state as string);

  return {
    state: state as string,
    nonce: nonce as string,
    cookieHeader: `__Host-auth.state=${stateCookie.value}`,
  };
};

const completeLineLogin = async (
  app: ReturnType<typeof createTestApp>,
  login: Awaited<ReturnType<typeof startLineLogin>>,
  code = `line-code-${ulid()}`,
) => {
  const response = await app.request(
    `http://localhost:3000/auth/callback/line?code=${code}&state=${login.state}`,
    {
      headers: {
        cookie: login.cookieHeader,
      },
    },
  );

  const sessionCookie = parseSetCookieHeader(
    response.headers.get('set-cookie') ?? '',
  ).get('__Host-session');

  return { response, sessionCookie };
};

describe('LINE ログイン', () => {
  const app = createTestApp(prisma);

  beforeEach(() => {
    verificationClaims = { ...lineClaims };
    verificationStatus = 200;
    tokenExchangeRequests = [];
    testStateIdentifiers = [];
    installLineProvider();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await prisma.authUser.deleteMany({ where: { email: lineEmail } });
    await prisma.authVerification.deleteMany({
      where: { identifier: { in: testStateIdentifiers } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】LINEの初回ログインと再ログインができる', async () => {
    const firstLogin = await startLineLogin(app);
    const firstCallback = await completeLineLogin(app, firstLogin);

    expect(firstCallback.response.status).toBe(302);
    expect(firstCallback.sessionCookie).toBeTruthy();
    expect(firstCallback.response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login-complete',
    );
    expect(tokenExchangeRequests[0]?.get('redirect_uri')).toBe(lineRedirectURI);
    expect(tokenExchangeRequests[0]?.get('code_verifier')).toBeTruthy();

    const firstUser = await prisma.authUser.findUnique({
      where: { email: lineEmail },
      include: { accounts: true, sessions: true },
    });

    expect(firstUser).toMatchObject({
      email: lineEmail,
      name: 'LINE Test User',
      accounts: [
        {
          providerId: 'line',
          issuer: 'https://access.line.me',
          accountId: lineClaims.sub,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
        },
      ],
    });
    expect(firstUser?.sessions).toHaveLength(1);

    const secondLogin = await startLineLogin(app);
    const secondCallback = await completeLineLogin(app, secondLogin);

    expect(secondCallback.response.status).toBe(302);
    expect(secondCallback.sessionCookie).toBeTruthy();
    expect(secondCallback.response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login-complete',
    );

    const userAfterSecondLogin = await prisma.authUser.findUnique({
      where: { email: lineEmail },
      include: { accounts: true, sessions: true },
    });
    expect(userAfterSecondLogin?.accounts).toHaveLength(1);
    expect(userAfterSecondLogin?.sessions).toHaveLength(2);
  });

  it.each([
    ['issuer', { iss: 'https://invalid.example.com' }],
    ['audience', { aud: 'another-client-id' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['subject', { sub: '' }],
    ['nonce', { nonce: 'invalid-nonce' }],
  ])(
    '【異常系】LINE IDトークンの%s検証に失敗した場合はログインを拒否する',
    async (_condition, override) => {
      verificationClaims = { ...lineClaims, ...override };
      const login = await startLineLogin(app);
      const callback = await completeLineLogin(app, login);

      expect(callback.response.status).toBe(302);
      const location = new URL(callback.response.headers.get('location') ?? '');
      expect(location.pathname).toBe('/auth/login-error');
      expect(location.searchParams.get('error')).toBe(
        'unable_to_get_user_info',
      );
      await expect(
        prisma.authUser.findUnique({ where: { email: lineEmail } }),
      ).resolves.toBeNull();
    },
  );

  it('【異常系】LINEのID token署名検証が失敗した場合はログインを拒否する', async () => {
    verificationStatus = 400;
    const login = await startLineLogin(app);
    const callback = await completeLineLogin(app, login);

    expect(callback.response.status).toBe(302);
    const location = new URL(callback.response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/auth/login-error');
    expect(location.searchParams.get('error')).toBe('unable_to_get_user_info');
    await expect(
      prisma.authUser.findUnique({ where: { email: lineEmail } }),
    ).resolves.toBeNull();
  });

  it('【異常系】LINEコールバックのstateを再利用できない', async () => {
    const login = await startLineLogin(app);
    const callback = await app.request(
      `http://localhost:3000/auth/callback/line?code=line-code&state=invalid-state`,
      {
        headers: { cookie: login.cookieHeader },
      },
    );

    expect(callback.status).toBe(302);
    const location = new URL(callback.headers.get('location') ?? '');
    expect(location.pathname).toBe('/auth/error');
    expect(location.searchParams.get('error')).toBe('state_mismatch');
  });
});
