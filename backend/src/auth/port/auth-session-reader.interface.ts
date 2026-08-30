export type AuthenticatedUser = {
  id: string;
};

export interface IAuthSessionReader {
  getAuthenticatedUser(params: {
    headers: Headers;
  }): Promise<AuthenticatedUser | undefined>;
}
