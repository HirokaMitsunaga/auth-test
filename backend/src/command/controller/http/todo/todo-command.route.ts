import { OpenAPIHono } from '@hono/zod-openapi';
import type { PrismaClient } from '@prisma/client';

import { createTodoRoute } from './create-todo-route.js';
import { updateTodoRoute } from './update-todo-route.js';
import { deleteTodoRoute } from './delete-todo-route.js';
import { CreateTodoUseCase } from '../../../usecase/todo/create-todo.use-case.js';
import { TodoRepositoryPrisma } from '../../../infra/todo.repository.prisma.js';
import { UserRepositoryPrisma } from '../../../infra/user.repository.prisma.js';
import { UpdateTodoUseCase } from '../../../usecase/todo/update-todo.use-case.js';
import { DomainError } from '../../../domain/domain-error.js';
import { HTTPException } from 'hono/http-exception';
import { NotFoundUsecaseError } from '../../../usecase/usecase-error.js';
import { DeleteTodoUseCase } from '../../../usecase/todo/delete-todo.use-case.js';

export const createTodoCommandApp = ({
  prisma,
}: {
  prisma: Pick<PrismaClient, 'todo' | 'user'>;
}) => {
  const todoCommandApp = new OpenAPIHono();
  const todoRepository = new TodoRepositoryPrisma(prisma);
  const userRepository = new UserRepositoryPrisma(prisma);
  const createTodoUseCase = new CreateTodoUseCase(
    todoRepository,
    userRepository,
  );
  const updateTodoUseCase = new UpdateTodoUseCase(
    todoRepository,
    userRepository,
  );
  const deleteTodoUseCase = new DeleteTodoUseCase(todoRepository);

  todoCommandApp.onError((error, c) => {
    if (error instanceof NotFoundUsecaseError) {
      return c.json({ message: error.message }, 404);
    }

    if (error instanceof DomainError) {
      return c.json({ message: error.message }, 400);
    }

    if (error instanceof HTTPException) {
      return c.json({ message: error.message }, error.status);
    }

    throw error;
  });

  createTodoRoute({ app: todoCommandApp, createTodoUseCase });
  updateTodoRoute({ app: todoCommandApp, updateTodoUseCase });
  deleteTodoRoute({ app: todoCommandApp, deleteTodoUseCase });

  return todoCommandApp;
};
