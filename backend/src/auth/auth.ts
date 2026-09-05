import type { IAuthRequestHandler } from './port/auth-request-handler.interface.js';
import { BetterAuthHandler } from './infra/better-auth/better-auth-handler.js';
import { createBetterAuth } from './infra/better-auth/better-auth-config.js';

type AuthDatabase = Parameters<typeof createBetterAuth>[0];

export const createAuth = (database: AuthDatabase): IAuthRequestHandler => {
  const auth = createBetterAuth(database);
  return new BetterAuthHandler(auth);
};
