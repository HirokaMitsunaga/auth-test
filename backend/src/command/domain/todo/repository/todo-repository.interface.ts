import { EntityId } from '../entity-id.vo.js';
import { Todo } from '../todo.entity.js';

export interface ITodoRepository {
  findById({ id }: { id: EntityId }): Promise<Todo | undefined>;
  create(params: { todo: Todo }): Promise<void>;
  update(params: { todo: Todo }): Promise<void>;
  delete(params: { todo: Todo }): Promise<void>;
}
