import type { PrismaClient } from '@prisma/client';
import type {
  TodoQueryService,
  FindTodosInput,
  FindTodosOutput,
} from '../todo/todo-query-service.interface.js';

export class TodoQueryServicePrisma implements TodoQueryService {
  constructor(private readonly prisma: Pick<PrismaClient, 'todo'>) {}

  async findAllByUser({
    userId,
    limit,
    cursor,
    title,
  }: FindTodosInput): Promise<FindTodosOutput> {
    const todos = await this.prisma.todo.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      where: {
        userId,
        ...(title
          ? {
              title: {
                contains: title,
              },
            }
          : {}),
      },
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        title: true,
        userId: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
    });

    const hasNextPage = todos.length > limit;
    const pageTodos = hasNextPage ? todos.slice(0, limit) : todos;

    return {
      todos: pageTodos,
      nextCursor: hasNextPage ? pageTodos.at(-1)?.id : undefined,
    };
  }
}
