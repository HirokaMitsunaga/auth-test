import type { EntityId } from '../../domain/todo/entity-id.vo.js';
import { NotFoundRepositoryError } from '../../domain/repository-error.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';
import { NotFoundUsecaseError } from '../usecase-error.js';

type DeleteUserInput = {
  id: EntityId;
};

export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute({ id }: DeleteUserInput): Promise<void> {
    const user = await this.userRepository.findById({ id });

    if (!user) {
      throw new NotFoundUsecaseError('User', id);
    }

    try {
      await this.userRepository.delete({ user });
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
