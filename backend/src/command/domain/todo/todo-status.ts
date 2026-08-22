export const TODO_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type TodoStatus = (typeof TODO_STATUS)[keyof typeof TODO_STATUS];
