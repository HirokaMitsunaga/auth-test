import { isValid } from 'ulid';
import { describe, expect, it } from 'vitest';

import { EntityId } from './entity-id.vo.js';
import { InvalidEntityIdFormatError } from './todo-error.js';

const captureError = (action: () => void): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('EntityId', () => {
  it('【正常系】新規生成したIDはULID形式である', () => {
    const id = EntityId.generate();

    expect(isValid(id.getEntityId())).toBe(true);
  });

  it.each([
    ['create', (entityId: string) => EntityId.create({ entityId })],
    ['reconstruct', (entityId: string) => EntityId.reconstruct({ entityId })],
  ])('【異常系】%sでULID形式ではないIDは作成できない', (_, factory) => {
    const entityId = 'invalid-id';

    const error = captureError(() => {
      factory(entityId);
    });

    expect(error).toBeInstanceOf(InvalidEntityIdFormatError);
    expect(error).toMatchObject({
      message: `Invalid ID format: ${entityId}`,
    });
  });

  it.each([
    ['同じID', '01ARZ3NDEKTSV4RRFFQ69G5FAV', true],
    ['異なるID', '01BX5ZZKBKACTAV9WEVGEMMVRZ', false],
  ])('【正常系】%sかどうかを判定する', (_, otherEntityId, expected) => {
    const id = EntityId.create({ entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV' });
    const other = EntityId.create({ entityId: otherEntityId });

    expect(id.equals(other)).toBe(expected);
  });
});
