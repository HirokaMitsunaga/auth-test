import { OpenAPIHono } from '@hono/zod-openapi';

import { createTodoRoute } from './create-todo-route.js';
import { updateTodoRoute } from './update-todo-route.js';
import { deleteTodoRoute } from './delete-todo-route.js';
import type { CreateTodoUseCase } from '../../../usecase/todo/create-todo.use-case.js';
import type { UpdateTodoUseCase } from '../../../usecase/todo/update-todo.use-case.js';
import type { DeleteTodoUseCase } from '../../../usecase/todo/delete-todo.use-case.js';
import { DomainError } from '../../../domain/domain-error.js';
import { HTTPException } from 'hono/http-exception';
import { NotFoundUsecaseError } from '../../../usecase/usecase-error.js';

export type TodoCommandDependencies = {
  createTodoUseCase: CreateTodoUseCase;
  updateTodoUseCase: UpdateTodoUseCase;
  deleteTodoUseCase: DeleteTodoUseCase;
};

export const createTodoCommandRoute = ({
  createTodoUseCase,
  updateTodoUseCase,
  deleteTodoUseCase,
}: TodoCommandDependencies) => {
  const todoCommandRoute = new OpenAPIHono();

  todoCommandRoute.onError((error, c) => {
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

  createTodoRoute({ app: todoCommandRoute, createTodoUseCase });
  updateTodoRoute({ app: todoCommandRoute, updateTodoUseCase });
  deleteTodoRoute({ app: todoCommandRoute, deleteTodoUseCase });

  return todoCommandRoute;
};
