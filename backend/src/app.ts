import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { PrismaClient } from '@prisma/client';

import type { AuthController } from './auth/controller/http/auth.controller.js';
import { createAuthRoute } from './auth/controller/http/auth.route.js';
import { createTodoCommandApp } from './command/controller/http/todo/todo-command.route.js';
import { createUserApp } from './command/controller/http/user/user.route.js';
import { createTodoQueryApp } from './query/controller/http/todo/todo-query.route.js';

type AppDatabase = Pick<PrismaClient, 'todo' | 'user'>;

export const createApp = ({
  db,
  authController,
}: {
  db: AppDatabase;
  authController: AuthController;
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

  app.route('/auth', createAuthRoute(authController));

  const todoCommandApp = createTodoCommandApp({ prisma: db });
  const todoQueryApp = createTodoQueryApp({ prisma: db });
  const userApp = createUserApp({ prisma: db });
  app.route('/todos', todoCommandApp);
  app.route('/todos', todoQueryApp);
  app.route('/users', userApp);

  return app;
};
