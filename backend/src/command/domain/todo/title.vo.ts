import { InvalidTitleValueError } from './todo-error.js';

export class TitleVO {
  private static readonly MIN = 3;
  private static readonly MAX = 100;
  private readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): TitleVO {
    if (value.length < this.MIN || value.length > this.MAX) {
      throw new InvalidTitleValueError(value);
    }
    return new TitleVO(value);
  }
  public static reconstruct(value: string): TitleVO {
    return new TitleVO(value);
  }

  public getValue(): string {
    return this.value;
  }
}
