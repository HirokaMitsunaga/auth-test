import { describe, expect, it } from 'vitest';

import { TitleVO } from './title.vo.js';
import { InvalidTitleValueError } from './todo-error.js';

const captureError = (action: () => void): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('TitleVO', () => {
  it.each(['abc', 'a'.repeat(100)])(
    '【正常系】タイトル文字数の境界値を作成できる',
    (value) => {
      const title = TitleVO.create(value);

      expect(title.getValue()).toBe(value);
    },
  );

  it.each(['ab', 'a'.repeat(101)])(
    '【異常系】タイトル文字数の範囲外は作成できない',
    (value) => {
      const error = captureError(() => {
        TitleVO.create(value);
      });

      expect(error).toBeInstanceOf(InvalidTitleValueError);
      expect(error).toMatchObject({
        message: `Invalid title value: ${value}`,
      });
    },
  );
});
