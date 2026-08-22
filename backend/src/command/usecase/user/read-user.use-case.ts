import type { User } from '../../domain/user/user.entity.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';

export class ReadUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    return await this.userRepository.findAllByUser();
  }
}
