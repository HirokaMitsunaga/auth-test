import { EntityId } from './entity-id.vo.js';
import type { PriorityVO } from './priority.vo.js';
import type { TitleVO } from './title.vo.js';
import { InvalidTodoOwnerError, InvalidTodoStatusError } from './todo-error.js';
import { TODO_STATUS, type TodoStatus } from './todo-status.js';

type TodoParams = {
  id: EntityId;
  title: TitleVO;
  status: TodoStatus;
  userId: EntityId;
  priority: PriorityVO;
};

export class Todo {
  private readonly id: EntityId;
  private readonly title: TitleVO;
  private readonly status: TodoStatus;
  private readonly userId: EntityId;
  private readonly priority: PriorityVO;
  private constructor({ id, title, status, userId, priority }: TodoParams) {
    this.id = id;
    this.title = title;
    this.status = status;
    this.userId = userId;
    this.priority = priority;
  }

  public static create({
    title,
    status,
    userId,
    priority,
  }: Omit<TodoParams, 'id'>): Todo {
    if (!Object.values(TODO_STATUS).includes(status)) {
      throw new InvalidTodoStatusError(status);
    }
    return new Todo({
      id: EntityId.generate(),
      title,
      status,
      userId,
      priority,
    });
  }

  public static reconstruct({
    id,
    title,
    status,
    userId,
    priority,
  }: TodoParams): Todo {
    return new Todo({
      id: EntityId.reconstruct({ entityId: id.getEntityId() }),
      title,
      status,
      userId: EntityId.reconstruct({ entityId: userId.getEntityId() }),
      priority,
    });
  }

  public update({
    title,
    status,
    userId,
    priority,
  }: Omit<TodoParams, 'id'>): Todo {
    if (!Object.values(TODO_STATUS).includes(status)) {
      throw new InvalidTodoStatusError(status);
    }

    if (!this.userId.equals(userId)) {
      throw new InvalidTodoOwnerError(this.userId, userId);
    }

    return new Todo({
      id: this.id,
      title,
      status,
      userId: this.userId,
      priority,
    });
  }

  getTitle(): TitleVO {
    return this.title;
  }

  getStatus(): TodoStatus {
    return this.status;
  }

  getUserId(): EntityId {
    return this.userId;
  }

  getPriority(): PriorityVO {
    return this.priority;
  }

  getId(): EntityId {
    return this.id;
  }
}
