import { z } from '@hono/zod-openapi';

export const TodoResponseSchema = z
  .object({
    id: z.ulid().openapi({
      example: '01J123456789ABCDEFGHJKMNPQ',
    }),
    title: z.string().openapi({
      example: '牛乳を買う',
    }),
    userId: z.ulid().openapi({
      example: '01J123456789ABCDEFGHJKMNPQ',
    }),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).openapi({
      example: 'PENDING',
    }),
    priority: z.number().int().openapi({
      example: 5,
    }),
    updatedAt: z.iso.datetime().openapi({
      example: '2026-07-20T12:00:00.000Z',
    }),
  })
  .openapi('TodoResponse');

export const TodoRequestSchema = z.object({
  userId: z.ulid().openapi({
    example: '01J123456789ABCDEFGHJKMNPQ',
  }),
  title: z.string().optional().openapi({
    example: '牛乳',
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    example: 20,
  }),
  cursor: z.ulid().optional().openapi({
    example: '01J123456789ABCDEFGHJKMNPQ',
  }),
});

export const TodoListResponseSchema = z
  .object({
    todos: z.array(TodoResponseSchema),
    nextCursor: z.ulid().optional(),
  })
  .openapi('TodoListResponse');
