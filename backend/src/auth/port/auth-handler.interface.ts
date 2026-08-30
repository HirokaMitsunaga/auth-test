export interface IAuthHandler {
  handle(request: Request): Promise<Response>;
}
