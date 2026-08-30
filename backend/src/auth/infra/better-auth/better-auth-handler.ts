import type { IAuthHandler } from '../../port/auth-handler.interface.js';

type BetterAuthHandlerClient = {
  handler(request: Request): Promise<Response>;
};

export class BetterAuthHandler implements IAuthHandler {
  constructor(private readonly auth: BetterAuthHandlerClient) {}

  async handle(request: Request): Promise<Response> {
    return await this.auth.handler(request);
  }
}
