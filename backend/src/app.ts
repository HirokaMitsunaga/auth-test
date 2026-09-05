import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { Env, Hono } from 'hono';

type AppRoute = Hono<Env>;

export const createApp = ({
  authRoute,
  todoCommandRoute,
  todoQueryRoute,
  userCommandRoute,
}: {
  authRoute: AppRoute;
  todoCommandRoute: AppRoute;
  todoQueryRoute: AppRoute;
  userCommandRoute: AppRoute;
}) => {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({ message: 'Validation Error' }, 400);
      }
    },
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ message: 'Internal Server Error' }, 503);
  });

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
    },
    servers: [{ url: 'http://localhost:3000' }],
  });
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));

  app.route('/auth', authRoute);
  app.route('/todos', todoCommandRoute);
  app.route('/todos', todoQueryRoute);
  app.route('/users', userCommandRoute);

  return app;
};
