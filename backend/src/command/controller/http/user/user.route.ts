import { OpenAPIHono } from '@hono/zod-openapi';
import type { PrismaClient } from '@prisma/client';
import { HTTPException } from 'hono/http-exception';

import { DomainError } from '../../../domain/domain-error.js';
import { UserRepositoryPrisma } from '../../../infra/user.repository.prisma.js';
import { CreateUserUseCase } from '../../../usecase/user/create-user.use-case.js';
import { DeleteUserUseCase } from '../../../usecase/user/delete-user.use-case.js';
import { NotFoundUsecaseError } from '../../../usecase/usecase-error.js';
import { UpdateUserUseCase } from '../../../usecase/user/update-user.use-case.js';
import { createUserRoute } from './create-user-route.js';
import { deleteUserRoute } from './delete-user-route.js';
import { ReadUserUseCase } from '../../../usecase/user/read-user.use-case.js';
import { readUserRoute } from './read-user-route.js';
import { updateUserRoute } from './update-user-route.js';

export const createUserApp = ({
  prisma,
}: {
  prisma: Pick<PrismaClient, 'user'>;
}) => {
  const userApp = new OpenAPIHono();
  const userRepository = new UserRepositoryPrisma(prisma);

  userApp.onError((error, c) => {
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
    app: userApp,
    createUserUseCase: new CreateUserUseCase(userRepository),
  });
  readUserRoute({
    app: userApp,
    readUserUseCase: new ReadUserUseCase(userRepository),
  });
  updateUserRoute({
    app: userApp,
    updateUserUseCase: new UpdateUserUseCase(userRepository),
  });
  deleteUserRoute({
    app: userApp,
    deleteUserUseCase: new DeleteUserUseCase(userRepository),
  });

  return userApp;
};
