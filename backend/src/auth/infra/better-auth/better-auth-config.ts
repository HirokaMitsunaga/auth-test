import { betterAuth } from 'better-auth';

export const createBetterAuth = () => {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_SECRET, BETTER_AUTH_URL, are required');
  }

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/auth',
    secret: process.env.BETTER_AUTH_SECRET,
  });
};
