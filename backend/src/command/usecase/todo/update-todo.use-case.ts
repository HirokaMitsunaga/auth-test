import type { ITodoRepository } from '../../domain/todo/repository/todo-repository.interface.js';
import { NotFoundRepositoryError } from '../../domain/repository-error.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';
import type { EntityId } from '../../domain/todo/entity-id.vo.js';
import type { PriorityVO } from '../../domain/todo/priority.vo.js';
import type { TitleVO } from '../../domain/todo/title.vo.js';
import type { TodoStatus } from '../../domain/todo/todo-status.js';
import { NotFoundUsecaseError } from '../usecase-error.js';

type UpdateTodoInput = {
  id: EntityId;
  title: TitleVO;
  userId: EntityId;
  status: TodoStatus;
  priority: PriorityVO;
};

export class UpdateTodoUseCase {
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute({
    id,
    title,
    userId,
    status,
    priority,
  }: UpdateTodoInput): Promise<void> {
    const todo = await this.todoRepository.findById({ id });

    if (!todo) {
      throw new NotFoundUsecaseError('ToDo', id);
    }

    const user = await this.userRepository.findById({ id: userId });

    if (!user) {
      throw new NotFoundUsecaseError('User', userId);
    }

    const updatedTodo = todo.update({ title, userId, status, priority });
    try {
      await this.todoRepository.update({ todo: updatedTodo });
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
