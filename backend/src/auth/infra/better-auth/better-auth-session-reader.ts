import type {
  AuthenticatedUser,
  IAuthSessionReader,
} from '../../port/auth-session-reader.interface.js';

type BetterAuthSessionReaderClient = {
  api: {
    getSession(params: {
      headers: Headers;
    }): Promise<{ user: { id: string } } | null>;
  };
};

export class BetterAuthSessionReader implements IAuthSessionReader {
  constructor(private readonly auth: BetterAuthSessionReaderClient) {}

  async getAuthenticatedUser({
    headers,
  }: {
    headers: Headers;
  }): Promise<AuthenticatedUser | undefined> {
    const session = await this.auth.api.getSession({ headers });

    if (!session) {
      return undefined;
    }

    return { id: session.user.id };
  }
}
