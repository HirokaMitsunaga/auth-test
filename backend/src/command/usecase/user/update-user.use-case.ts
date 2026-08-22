import type { EntityId } from '../../domain/todo/entity-id.vo.js';
import { NotFoundRepositoryError } from '../../domain/repository-error.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';
import { NotFoundUsecaseError } from '../usecase-error.js';

type UpdateUserInput = {
  id: EntityId;
  name: string;
  email: string;
  password: string;
};

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute({ id, name, email, password }: UpdateUserInput): Promise<void> {
    const user = await this.userRepository.findById({ id });

    if (!user) {
      throw new NotFoundUsecaseError('User', id);
    }

    try {
      await this.userRepository.update({
        user: user.update({ name, email, password }),
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
