import { describe, expect, it } from 'vitest';

import { EntityId } from './entity-id.vo.js';
import { PriorityVO } from './priority.vo.js';
import { TitleVO } from './title.vo.js';
import { InvalidTodoOwnerError, InvalidTodoStatusError } from './todo-error.js';
import { TODO_STATUS, type TodoStatus } from './todo-status.js';
import { Todo } from './todo.entity.js';

const captureError = (action: () => void): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
};

const todoId = EntityId.create({ entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV' });
const userId = EntityId.create({ entityId: '01BX5ZZKBKACTAV9WEVGEMMVRZ' });
const otherUserId = EntityId.create({ entityId: '01BX5ZZKBKACTAV9WEVGEMMVRY' });

const createTitle = (value = 'todo title') => TitleVO.create(value);
const createPriority = (value = 5) => PriorityVO.create(value);

describe('Todo', () => {
  it.each(Object.values(TODO_STATUS))(
    '【正常系】有効なステータスでTodoを作成できる: %s',
    (status) => {
      const todo = Todo.create({
        title: createTitle(),
        status,
        userId,
        priority: createPriority(),
      });

      expect(todo.getStatus()).toBe(status);
    },
  );

  it('【異常系】無効なステータスではTodoを作成できない', () => {
    const status = 'INVALID' as TodoStatus;

    const error = captureError(() => {
      Todo.create({
        title: createTitle(),
        status,
        userId,
        priority: createPriority(),
      });
    });

    expect(error).toBeInstanceOf(InvalidTodoStatusError);
    expect(error).toMatchObject({
      message: `Invalid todo status: ${status}`,
    });
  });

  it('【正常系】同じ所有者のTodoを更新できる', () => {
    const todo = Todo.reconstruct({
      id: todoId,
      title: createTitle('before title'),
      status: TODO_STATUS.PENDING,
      userId,
      priority: createPriority(3),
    });

    const updated = todo.update({
      title: createTitle('after title'),
      status: TODO_STATUS.COMPLETED,
      userId,
      priority: createPriority(8),
    });

    expect(updated.getTitle().getValue()).toBe('after title');
    expect(updated.getStatus()).toBe(TODO_STATUS.COMPLETED);
    expect(updated.getPriority().getValue()).toBe(8);
    expect(updated.getUserId().equals(userId)).toBe(true);
    expect(updated.getId().equals(todoId)).toBe(true);
  });

  it('【異常系】所有者が異なるTodoは更新できない', () => {
    const todo = Todo.reconstruct({
      id: todoId,
      title: createTitle(),
      status: TODO_STATUS.PENDING,
      userId,
      priority: createPriority(),
    });

    const error = captureError(() => {
      todo.update({
        title: createTitle('after title'),
        status: TODO_STATUS.COMPLETED,
        userId: otherUserId,
        priority: createPriority(8),
      });
    });

    expect(error).toBeInstanceOf(InvalidTodoOwnerError);
    expect(error).toMatchObject({
      message: `Todo owner cannot be changed from ${userId.getEntityId()} to ${otherUserId.getEntityId()}`,
    });
  });
});
