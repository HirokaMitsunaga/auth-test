import type { MiddlewareHandler } from 'hono';

import type { GetAuthenticatedUserUseCase } from '../../usecase/get-authenticated-user.use-case.js';
import type { AuthenticatedUser } from '../../port/auth-session-reader.interface.js';

export type AuthenticatedUserEnv = {
  Variables: {
    authenticatedUser: AuthenticatedUser;
  };
};

export const requireAuthenticatedUser = (
  getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
): MiddlewareHandler<AuthenticatedUserEnv> => {
  return async (c, next) => {
    const authenticatedUser = await getAuthenticatedUserUseCase.execute({
      headers: c.req.raw.headers,
    });

    if (!authenticatedUser) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    c.set('authenticatedUser', authenticatedUser);
    await next();
  };
};
