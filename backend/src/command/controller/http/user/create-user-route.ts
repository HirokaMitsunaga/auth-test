import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { CreateUserUseCase } from '../../../usecase/user/create-user.use-case.js';
import { UserRequestSchema } from './user.schema.js';

const route = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UserRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: 'User created successfully' },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
    503: {
      description: 'Internal Server Error',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
  },
});

export const createUserRoute = ({
  app,
  createUserUseCase,
}: {
  app: OpenAPIHono;
  createUserUseCase: CreateUserUseCase;
}) => {
  app.openapi(route, async (c) => {
    const request = c.req.valid('json');
    await createUserUseCase.execute(request);
    return c.body(null, 204);
  });
};
