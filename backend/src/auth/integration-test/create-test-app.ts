import type { PrismaClient } from '@prisma/client';

import { createApp as createApplication } from '../../app.js';
import { createAuth } from '../auth.js';
import { createAuthRoute } from '../route.js';
import { createTodoCommandRoute } from '../../command/controller/http/todo/todo-command.route.js';
import { createUserCommandRoute } from '../../command/controller/http/user/user.route.js';
import { createTodoQueryRoute } from '../../query/controller/http/todo/todo-query.route.js';
import { createTodoDependencies } from '../../todo.composition.js';
import { createUserDependencies } from '../../user.composition.js';

export const createTestApp = (db: PrismaClient) => {
  process.env.BETTER_AUTH_SECRET ??=
    '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  process.env.LINE_CLIENT_ID ??= 'line-test-client-id';
  process.env.LINE_CLIENT_SECRET ??= 'line-test-client-secret';
  process.env.LINE_REDIRECT_URI ??= 'http://localhost:3000/auth/callback/line';

  const todoDependencies = createTodoDependencies({ db });
  const userDependencies = createUserDependencies({ db });

  return createApplication({
    authRoute: createAuthRoute(createAuth(db)),
    todoCommandRoute: createTodoCommandRoute(todoDependencies.todoCommand),
    todoQueryRoute: createTodoQueryRoute(todoDependencies.todoQuery),
    userCommandRoute: createUserCommandRoute(userDependencies.user),
  });
};
