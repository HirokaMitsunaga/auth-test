import type { PrismaClient } from '@prisma/client';

import { UserRepositoryPrisma } from './command/infra/user.repository.prisma.js';
import { CreateUserUseCase } from './command/usecase/user/create-user.use-case.js';
import { DeleteUserUseCase } from './command/usecase/user/delete-user.use-case.js';
import { ReadUserUseCase } from './command/usecase/user/read-user.use-case.js';
import { UpdateUserUseCase } from './command/usecase/user/update-user.use-case.js';

export const createUserDependencies = ({
  db,
}: {
  db: Pick<PrismaClient, 'user'>;
}) => {
  const userRepository = new UserRepositoryPrisma(db);

  return {
    user: {
      createUserUseCase: new CreateUserUseCase(userRepository),
      readUserUseCase: new ReadUserUseCase(userRepository),
      updateUserUseCase: new UpdateUserUseCase(userRepository),
      deleteUserUseCase: new DeleteUserUseCase(userRepository),
    },
  };
};
