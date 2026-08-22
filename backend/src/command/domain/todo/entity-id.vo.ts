import { isValid, ulid } from 'ulid';
import { InvalidEntityIdFormatError } from './todo-error.js';

export class EntityId {
  private readonly entityId: string;

  private constructor({ entityId }: { entityId: string }) {
    if (!isValid(entityId)) {
      throw new InvalidEntityIdFormatError(entityId);
    }
    this.entityId = entityId;
  }

  //新規生成時
  public static generate(): EntityId {
    return new EntityId({ entityId: ulid() });
  }

  //バリデーション付きの作成
  public static create({ entityId }: { entityId: string }): EntityId {
    return new EntityId({ entityId });
  }

  //DB取得時
  public static reconstruct({ entityId }: { entityId: string }): EntityId {
    return new EntityId({ entityId });
  }

  public equals(other: EntityId): boolean {
    return this.entityId === other.getEntityId();
  }
  public getEntityId(): string {
    return this.entityId;
  }
}
