import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { prisma } from './prisma.js';

const app = createApp(prisma);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
