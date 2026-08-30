import type { HandleAuthUseCase } from '../../usecase/handle-auth.use-case.js';

export class AuthController {
  constructor(private readonly handleAuthUseCase: HandleAuthUseCase) {}

  async handle(request: Request): Promise<Response> {
    return await this.handleAuthUseCase.execute({ request });
  }
}
