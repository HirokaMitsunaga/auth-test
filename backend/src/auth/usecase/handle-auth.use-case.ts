import type { IAuthHandler } from '../port/auth-handler.interface.js';

export class HandleAuthUseCase {
  constructor(private readonly authHandler: IAuthHandler) {}

  async execute({ request }: { request: Request }): Promise<Response> {
    return await this.authHandler.handle(request);
  }
}
