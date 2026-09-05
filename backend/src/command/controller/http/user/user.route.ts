import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

import { DomainError } from '../../../domain/domain-error.js';
import type { CreateUserUseCase } from '../../../usecase/user/create-user.use-case.js';
import type { DeleteUserUseCase } from '../../../usecase/user/delete-user.use-case.js';
import { NotFoundUsecaseError } from '../../../usecase/usecase-error.js';
import type { UpdateUserUseCase } from '../../../usecase/user/update-user.use-case.js';
import { createUserRoute } from './create-user-route.js';
import { deleteUserRoute } from './delete-user-route.js';
import type { ReadUserUseCase } from '../../../usecase/user/read-user.use-case.js';
import { readUserRoute } from './read-user-route.js';
import { updateUserRoute } from './update-user-route.js';

export type UserDependencies = {
  createUserUseCase: CreateUserUseCase;
  readUserUseCase: ReadUserUseCase;
  updateUserUseCase: UpdateUserUseCase;
  deleteUserUseCase: DeleteUserUseCase;
};

export const createUserCommandRoute = ({
  createUserUseCase,
  readUserUseCase,
  updateUserUseCase,
  deleteUserUseCase,
}: UserDependencies) => {
  const userCommandRoute = new OpenAPIHono();

  userCommandRoute.onError((error, c) => {
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

  createUserRoute({
    app: userCommandRoute,
    createUserUseCase,
  });
  readUserRoute({
    app: userCommandRoute,
    readUserUseCase,
  });
  updateUserRoute({
    app: userCommandRoute,
    updateUserUseCase,
  });
  deleteUserRoute({
    app: userCommandRoute,
    deleteUserUseCase,
  });

  return userCommandRoute;
};
