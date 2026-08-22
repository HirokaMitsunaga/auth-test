import { describe, expect, it } from 'vitest';

import { PriorityVO } from './priority.vo.js';
import { InvalidPriorityValueError } from './todo-error.js';

const captureError = (action: () => void): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('PriorityVO', () => {
  it.each([1, 10])('【正常系】優先度の境界値を作成できる: %i', (value) => {
    const priority = PriorityVO.create(value);

    expect(priority.getValue()).toBe(value);
  });

  it.each([0, 11])('【異常系】優先度の範囲外は作成できない: %i', (value) => {
    const error = captureError(() => {
      PriorityVO.create(value);
    });

    expect(error).toBeInstanceOf(InvalidPriorityValueError);
    expect(error).toMatchObject({
      message: `Invalid priority value: ${value}`,
    });
  });
});
