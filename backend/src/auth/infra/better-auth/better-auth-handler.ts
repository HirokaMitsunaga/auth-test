import type { IAuthRequestHandler } from '../../port/auth-request-handler.interface.js';

type BetterAuthHandlerClient = {
  handler(request: Request): Promise<Response>;
};

export class BetterAuthHandler implements IAuthRequestHandler {
  constructor(private readonly auth: BetterAuthHandlerClient) {}

  async handle(request: Request): Promise<Response> {
    return await this.auth.handler(request);
  }
}
