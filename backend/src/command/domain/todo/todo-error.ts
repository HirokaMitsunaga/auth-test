import { DomainError } from '../domain-error.js';
import type { EntityId } from './entity-id.vo.js';
import type { TodoStatus } from './todo-status.js';

export class InvalidTodoStatusError extends DomainError {
  constructor(status: TodoStatus) {
    super(`Invalid todo status: ${status}`);
  }
}

export class InvalidTodoOwnerError extends DomainError {
  constructor(currentUserId: EntityId, newUserId: EntityId) {
    super(
      `Todo owner cannot be changed from ${currentUserId.getEntityId()} to ${newUserId.getEntityId()}`,
    );
  }
}

export class InvalidTitleValueError extends DomainError {
  constructor(value: string) {
    super(`Invalid title value: ${value}`);
  }
}

export class InvalidEntityIdFormatError extends DomainError {
  constructor(entityId: string) {
    super(`Invalid ID format: ${entityId}`);
  }
}
export class InvalidPriorityValueError extends DomainError {
  constructor(value: number) {
    super(`Invalid priority value: ${value}`);
  }
}
