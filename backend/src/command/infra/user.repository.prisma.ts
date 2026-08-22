import { Prisma, type PrismaClient } from '@prisma/client';
import { EntityId } from '../domain/todo/entity-id.vo.js';
import { User } from '../domain/user/user.entity.js';
import { NotFoundRepositoryError } from '../domain/repository-error.js';
import type { IUserRepository } from '../domain/user/repository/user-repository.interface.js';

export class UserRepositoryPrisma implements IUserRepository {
  constructor(private readonly prisma: Pick<PrismaClient, 'user'>) {}

  async findById({ id }: { id: EntityId }): Promise<User | undefined> {
    const userEntity = await this.prisma.user.findFirst({
      where: {
        id: id.getEntityId(),
      },
    });
    if (!userEntity) {
      return undefined;
    }
    return User.reconstruct({
      id: EntityId.reconstruct({ entityId: userEntity.id }),
      name: userEntity.name,
      email: userEntity.email,
      password: userEntity.password,
    });
  }

  async findAllByUser(): Promise<User[]> {
    const userEntities = await this.prisma.user.findMany();

    return userEntities.map((userEntity) =>
      User.reconstruct({
        id: EntityId.reconstruct({ entityId: userEntity.id }),
        name: userEntity.name,
        email: userEntity.email,
        password: userEntity.password,
      }),
    );
  }

  async create({ user }: { user: User }): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.getId().getEntityId(),
        name: user.getName(),
        email: user.getEmail(),
        password: user.getPassword(),
      },
    });
  }

  async update({ user }: { user: User }): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: user.getId().getEntityId(),
        },
        data: {
          name: user.getName(),
          email: user.getEmail(),
          password: user.getPassword(),
        },
      });
    } catch (error) {
      this.handlePrismaError({ error, entityId: user.getId() });
    }
  }

  async delete({ user }: { user: User }): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: {
          id: user.getId().getEntityId(),
        },
      });
    } catch (error) {
      this.handlePrismaError({ error, entityId: user.getId() });
    }
  }

  private handlePrismaError({
    error,
    entityId,
  }: {
    error: unknown;
    entityId: EntityId;
  }): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundRepositoryError('User', entityId, {
        cause: error,
      });
    }

    throw error;
  }
}
