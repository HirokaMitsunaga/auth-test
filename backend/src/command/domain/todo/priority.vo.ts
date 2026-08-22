import { InvalidPriorityValueError } from './todo-error.js';

export class PriorityVO {
  private static readonly MIN = 1;
  private static readonly MAX = 10;
  private readonly value: number;
  private constructor(value: number) {
    this.value = value;
  }

  public static create(value: number): PriorityVO {
    if (value < this.MIN || value > this.MAX) {
      throw new InvalidPriorityValueError(value);
    }
    return new PriorityVO(value);
  }
  public static reconstruct(value: number): PriorityVO {
    return new PriorityVO(value);
  }
  public getValue(): number {
    return this.value;
  }
}
