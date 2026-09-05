import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createAuth } from './auth/auth.js';
import { createAuthRoute } from './auth/route.js';
import { createTodoCommandRoute } from './command/controller/http/todo/todo-command.route.js';
import { createUserCommandRoute } from './command/controller/http/user/user.route.js';
import { createTodoQueryRoute } from './query/controller/http/todo/todo-query.route.js';
import { prisma } from './prisma.js';
import { createTodoDependencies } from './todo.composition.js';
import { createUserDependencies } from './user.composition.js';

const todoDependencies = createTodoDependencies({ db: prisma });
const userDependencies = createUserDependencies({ db: prisma });

const app = createApp({
  authRoute: createAuthRoute(createAuth(prisma)),
  todoCommandRoute: createTodoCommandRoute(todoDependencies.todoCommand),
  todoQueryRoute: createTodoQueryRoute(todoDependencies.todoQuery),
  userCommandRoute: createUserCommandRoute(userDependencies.user),
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
