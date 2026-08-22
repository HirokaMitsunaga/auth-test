import type {
  TodoQueryService,
  FindTodosOutput,
} from '../../todo/todo-query-service.interface.js';

export type ReadTodosInput = {
  userId: string;
  limit: number;
  cursor?: string;
  title?: string;
};

export class ReadTodoUseCase {
  constructor(private readonly todoQueryService: TodoQueryService) {}

  async execute({
    userId,
    limit,
    cursor,
    title,
  }: ReadTodosInput): Promise<FindTodosOutput> {
    return await this.todoQueryService.findAllByUser({
      userId,
      limit,
      cursor,
      title,
    });
  }
}
