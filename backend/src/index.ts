import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createAuth } from './auth/auth.js';
import { prisma } from './prisma.js';

const auth = createAuth(prisma);

const app = createApp({ db: prisma, auth });

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
