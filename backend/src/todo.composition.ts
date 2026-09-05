import type { PrismaClient } from '@prisma/client';

import { TodoRepositoryPrisma } from './command/infra/todo.repository.prisma.js';
import { UserRepositoryPrisma } from './command/infra/user.repository.prisma.js';
import { CreateTodoUseCase } from './command/usecase/todo/create-todo.use-case.js';
import { DeleteTodoUseCase } from './command/usecase/todo/delete-todo.use-case.js';
import { UpdateTodoUseCase } from './command/usecase/todo/update-todo.use-case.js';
import { TodoQueryServicePrisma } from './query/infra/todo-query-service.prisma.js';
import { ReadTodoUseCase } from './query/usecase/todo/read-todo.use-case.js';

export const createTodoDependencies = ({
  db,
}: {
  db: Pick<PrismaClient, 'todo' | 'user'>;
}) => {
  const todoRepository = new TodoRepositoryPrisma(db);
  const userRepository = new UserRepositoryPrisma(db);
  const todoQueryService = new TodoQueryServicePrisma(db);

  return {
    todoCommand: {
      createTodoUseCase: new CreateTodoUseCase(todoRepository, userRepository),
      updateTodoUseCase: new UpdateTodoUseCase(todoRepository, userRepository),
      deleteTodoUseCase: new DeleteTodoUseCase(todoRepository),
    },
    todoQuery: {
      readTodoUseCase: new ReadTodoUseCase(todoQueryService),
    },
  };
};
