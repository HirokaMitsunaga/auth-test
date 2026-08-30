import { OpenAPIHono } from '@hono/zod-openapi';

import type { AuthController } from './auth.controller.js';

export const createAuthRoute = (authController: AuthController) => {
  const app = new OpenAPIHono();

  app.all('*', (c) => authController.handle(c.req.raw));

  return app;
};
