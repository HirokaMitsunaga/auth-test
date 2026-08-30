import type {
  AuthenticatedUser,
  IAuthSessionReader,
} from '../port/auth-session-reader.interface.js';

export class GetAuthenticatedUserUseCase {
  constructor(private readonly authSessionReader: IAuthSessionReader) {}

  async execute({
    headers,
  }: {
    headers: Headers;
  }): Promise<AuthenticatedUser | undefined> {
    return await this.authSessionReader.getAuthenticatedUser({ headers });
  }
}
