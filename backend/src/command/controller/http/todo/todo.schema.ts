import { z } from '@hono/zod-openapi';

export const TodoRequestSchema = z
  .object({
    title: z.string().openapi({
      example: '牛乳を買う',
    }),

    userId: z.string().openapi({
      example: '01J123456789ABCDEFGHJKMNPQ',
    }),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).openapi({
      example: 'PENDING',
    }),
    priority: z.number().int().openapi({
      example: 5,
    }),
  })
  .openapi('TodoRequest');
