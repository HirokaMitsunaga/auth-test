import type { EntityId } from '../../todo/entity-id.vo.js';
import { User } from '../user.entity.js';

export interface IUserRepository {
  findById({ id }: { id: EntityId }): Promise<User | undefined>;
  findAllByUser(): Promise<User[]>;
  create(params: { user: User }): Promise<void>;
  update(params: { user: User }): Promise<void>;
  delete(params: { user: User }): Promise<void>;
}
