import { OpenAPIHono } from '@hono/zod-openapi';

type AuthHandler = {
  handler: (request: Request) => Promise<Response>;
};

export const createAuthRoute = (auth: AuthHandler) => {
  const app = new OpenAPIHono();

  app.all('*', (c) => auth.handler(c.req.raw));

  return app;
};
