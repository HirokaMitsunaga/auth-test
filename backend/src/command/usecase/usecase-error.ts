import type { EntityId } from '../domain/todo/entity-id.vo.js';

export abstract class UsecaseError extends Error {
  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class NotFoundUsecaseError extends UsecaseError {
  constructor(resource: string, entityId: EntityId, options?: ErrorOptions) {
    super(`${resource}: ${entityId.getEntityId()} not found`, options);
  }
}
