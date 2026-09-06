import { Hono } from 'hono';

import type { IAuthRequestHandler } from './port/auth-request-handler.interface.js';

export const createAuthRoute = (auth: IAuthRequestHandler) => {
  const authRoute = new Hono();

  if (process.env.NODE_ENV !== 'production') {
    authRoute.get('/line-login-test', () => htmlResponse(lineLoginTestPage));
    authRoute.get('/login-complete', () => htmlResponse(lineLoginCompletePage));
    authRoute.get('/login-error', () => htmlResponse(lineLoginErrorPage));
  }

  authRoute.post('/sign-in/social', (c) => auth.handle(c.req.raw));
  authRoute.on(['GET', 'POST'], '/callback/line', (c) =>
    auth.handle(c.req.raw),
  );

  return authRoute;
};
const htmlResponse = (body: string) =>
  new Response(body, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
  });

const lineLoginTestPage = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LINE Login Test</title>
  </head>
  <body>
    <main>
      <h1>LINE Login Test</h1>
      <button id="login" type="button">LINEでログイン</button>
      <p id="status" role="status"></p>
    </main>

    <script>
      const button = document.querySelector('#login');
      const status = document.querySelector('#status');

      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'LINEログインを開始しています...';

        try {
          const response = await fetch('/auth/sign-in/social', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: 'line',
              callbackURL: new URL(
                '/auth/login-complete',
                window.location.origin,
              ).toString(),
              errorCallbackURL: new URL(
                '/auth/login-error',
                window.location.origin,
              ).toString(),
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.url) {
            throw new Error(data.message || 'LINE認証URLを取得できませんでした');
          }

          window.location.assign(data.url);
        } catch (error) {
          button.disabled = false;
          status.textContent =
            error instanceof Error ? error.message : 'LINEログインに失敗しました';
        }
      });
    </script>
  </body>
</html>`;

const lineLoginCompletePage = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LINE Login Complete</title>
  </head>
  <body>
    <h1>LINEログイン成功</h1>
    <p>認証が完了しました。</p>
  </body>
</html>`;

const lineLoginErrorPage = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LINE Login Error</title>
  </head>
  <body>
    <h1>LINEログイン失敗</h1>
    <pre id="details"></pre>
    <script>
      document.querySelector('#details').textContent = window.location.href;
    </script>
  </body>
</html>`;
