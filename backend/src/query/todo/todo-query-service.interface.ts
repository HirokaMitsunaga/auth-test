import type { TodoStatus } from '../../command/domain/todo/todo-status.js';

type TodoReadModel = {
  id: string;
  title: string;
  userId: string;
  status: TodoStatus;
  priority: number;
  updatedAt: Date;
};

export type FindTodosInput = {
  userId: string;
  limit: number;
  cursor?: string;
  title?: string;
};

export type FindTodosOutput = {
  todos: TodoReadModel[];
  nextCursor?: string;
};

export interface TodoQueryService {
  findAllByUser({
    userId,
    limit,
    cursor,
    title,
  }: FindTodosInput): Promise<FindTodosOutput>;
}
