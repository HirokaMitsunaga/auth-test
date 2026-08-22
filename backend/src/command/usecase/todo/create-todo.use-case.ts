import { Todo } from '../../domain/todo/todo.entity.js';
import type { ITodoRepository } from '../../domain/todo/repository/todo-repository.interface.js';
import type { TitleVO } from '../../domain/todo/title.vo.js';
import type { TodoStatus } from '../../domain/todo/todo-status.js';
import type { EntityId } from '../../domain/todo/entity-id.vo.js';
import type { PriorityVO } from '../../domain/todo/priority.vo.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';
import { NotFoundRepositoryError } from '../../domain/repository-error.js';
import { NotFoundUsecaseError } from '../usecase-error.js';

type CreateTodoInput = {
  title: TitleVO;
  userId: EntityId;
  status: TodoStatus;
  priority: PriorityVO;
};
export class CreateTodoUseCase {
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute({
    title,
    userId,
    status,
    priority,
  }: CreateTodoInput): Promise<void> {
    const user = await this.userRepository.findById({ id: userId });

    if (!user) {
      throw new NotFoundUsecaseError('User', userId);
    }

    try {
      await this.todoRepository.create({
        todo: Todo.create({ title, userId, status, priority }),
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundRepositoryError) {
        throw new NotFoundUsecaseError(error.resource, error.entityId, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
