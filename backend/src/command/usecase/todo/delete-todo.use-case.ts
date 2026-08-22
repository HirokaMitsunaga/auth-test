import type { ITodoRepository } from '../../domain/todo/repository/todo-repository.interface.js';
import { NotFoundRepositoryError } from '../../domain/repository-error.js';
import type { EntityId } from '../../domain/todo/entity-id.vo.js';
import { NotFoundUsecaseError } from '../usecase-error.js';

type DeleteTodoInput = {
  id: EntityId;
};

export class DeleteTodoUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute({ id }: DeleteTodoInput): Promise<void> {
    const todo = await this.todoRepository.findById({ id });

    if (!todo) {
      throw new NotFoundUsecaseError('ToDo', id);
    }

    try {
      await this.todoRepository.delete({ todo });
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
