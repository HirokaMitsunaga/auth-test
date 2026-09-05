import { Hono } from 'hono';

import type { IAuthRequestHandler } from './port/auth-request-handler.interface.js';

export const createAuthRoute = (auth: IAuthRequestHandler) => {
  const authRoute = new Hono();

  authRoute.post('/sign-in/social', (c) => auth.handle(c.req.raw));
  authRoute.on(['GET', 'POST'], '/callback/line', (c) =>
    auth.handle(c.req.raw),
  );

  return authRoute;
};
