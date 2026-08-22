import { User } from '../../domain/user/user.entity.js';
import type { IUserRepository } from '../../domain/user/repository/user-repository.interface.js';

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute({ name, email, password }: CreateUserInput): Promise<void> {
    await this.userRepository.create({
      user: User.create({ name, email, password }),
    });
  }
}
