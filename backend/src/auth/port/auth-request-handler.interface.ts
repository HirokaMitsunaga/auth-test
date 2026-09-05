export interface IAuthRequestHandler {
  handle(request: Request): Promise<Response>;
}
