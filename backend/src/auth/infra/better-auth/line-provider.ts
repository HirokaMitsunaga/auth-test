import { createAuthorizationURL } from 'better-auth/oauth2';
import type { OAuth2Tokens } from 'better-auth/oauth2';
import { line as createStandardLineProvider } from 'better-auth/social-providers';
import type { BetterAuthPlugin } from 'better-auth';
import * as z from 'zod';

const LINE_ISSUER = 'https://access.line.me';
const LINE_ID_TOKEN_VERIFY_ENDPOINT = 'https://api.line.me/oauth2/v2.1/verify';
const LINE_ID_TOKEN_CLOCK_SKEW_SECONDS = 60;

type LineProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
};

const lineIdTokenClaimsSchema = z.object({
  iss: z.literal(LINE_ISSUER),
  sub: z.string().min(1),
  aud: z.string(),
  exp: z.number().finite(),
  iat: z.number().finite(),
  nonce: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

type LineIdTokenClaims = z.infer<typeof lineIdTokenClaimsSchema>;

type OAuth2TokensWithNonce = OAuth2Tokens & {
  expectedIdTokenNonce?: string;
};

const parseLineIdTokenClaims = (
  value: unknown,
  clientId: string,
  expectedNonce: string,
): LineIdTokenClaims | undefined => {
  const parsed = lineIdTokenClaimsSchema.safeParse(value);
  if (!parsed.success) return undefined;

  const now = Math.floor(Date.now() / 1000);
  const claims = parsed.data;

  if (
    claims.aud !== clientId ||
    claims.exp <= now ||
    claims.iat > now + LINE_ID_TOKEN_CLOCK_SKEW_SECONDS ||
    claims.nonce !== expectedNonce
  ) {
    return undefined;
  }

  return claims;
};

const verifyLineIdToken = async (params: {
  token: string | undefined;
  clientId: string;
  expectedNonce?: string;
}): Promise<LineIdTokenClaims | undefined> => {
  if (!params.token || !params.expectedNonce) return undefined;

  try {
    const body = new URLSearchParams({
      id_token: params.token,
      client_id: params.clientId,
      nonce: params.expectedNonce,
    });
    const response = await fetch(LINE_ID_TOKEN_VERIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) return undefined;

    const claims: unknown = await response.json();
    return parseLineIdTokenClaims(
      claims,
      params.clientId,
      params.expectedNonce,
    );
  } catch {
    return undefined;
  }
};

export const createLineProviderPlugin = (
  config: LineProviderConfig,
): BetterAuthPlugin => {
  const standardProvider = createStandardLineProvider({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectURI: config.redirectURI,
    disableDefaultScope: true,
    scope: ['openid', 'profile'],
    // LINE の認可コードフローだけを使用し、クライアントから直接送られる
    // ID token のログイン経路は有効化しない。
    disableIdTokenSignIn: true,
    getUserInfo: async (tokens) => {
      const claims = await verifyLineIdToken({
        token: tokens.idToken,
        clientId: config.clientId,
        expectedNonce: (tokens as OAuth2TokensWithNonce).expectedIdTokenNonce,
      });

      if (!claims) return null;

      return {
        user: {
          name: claims.name ?? '',
          email: `line-${claims.sub}@example.invalid`,
          image: claims.picture,
          emailVerified: false,
        },
        data: claims,
      };
    },
  });

  const provider = {
    ...standardProvider,
    issuer: LINE_ISSUER,
    requiresIdTokenNonce: true,
    createAuthorizationURL: (params: {
      state: string;
      codeVerifier: string;
      redirectURI: string;
      idTokenNonce?: string;
      additionalParams?: Record<string, string>;
    }) =>
      createAuthorizationURL({
        id: 'line',
        options: {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectURI: config.redirectURI,
        },
        authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize',
        scopes: ['openid', 'profile'],
        state: params.state,
        codeVerifier: params.codeVerifier,
        redirectURI: params.redirectURI,
        nonce: params.idTokenNonce,
        additionalParams: params.additionalParams,
      }),
  };

  return {
    id: 'line-provider',
    version: '1.7.2',
    init: () => ({
      context: {
        socialProviders: [provider],
      },
    }),
  };
};
