# auth-api

## 実際の動作テスト

ここからは、実際のLINEアカウントを使ってスマホで動作確認する手順です。

### 1. LINE Developers Consoleでチャンネルを作成する

LINE Developers Consoleで次の設定を行います。

1. Providerを作成
2. LINE Loginチャンネルを作成
3. App typeに`Web app`を指定
4. Channel IDとChannel secretを取得
5. Callback URLを登録

Callback URLは、公開URLを使って次の形式で登録します。

```text
https://{公開ホスト}/auth/callback/line
```

このパスは、`backend/src/auth/route.ts`で定義されています。

Callback URLは、後述する環境変数と完全に一致させる必要があります。末尾の`/`の有無にも注意してください。

### 2. localhostをHTTPSの公開URLにする

スマホから`localhost`へアクセスすると、スマホ自身を指してしまいます。

そこで、Cloudflare Quick Tunnelを使って、ローカルサーバーを一時的なHTTPS URLとして公開します。

まず、データベースを起動します。

```bash
docker compose up -d db
```

別のターミナルで、アプリケーションのポートを公開します。

```bash
cloudflared tunnel --url http://localhost:3000
```

次のようなURLが表示されます。

```text
https://example-random.trycloudflare.com
```

このURLを、以降の`PUBLIC_URL`として使用します。

### 3.環境変数を設定して起動する

開発環境では、`localhost`やダミーのLINE認証情報が設定されている場合があります。

実機テストでは、公開URLとLINE Developers Consoleで取得した値を設定します。

```bash
export PUBLIC_URL="https://example-random.trycloudflare.com"

export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/app?schema=public"
export BETTER_AUTH_SECRET="ローカルテスト用のランダムな秘密鍵"
export BETTER_AUTH_URL="$PUBLIC_URL"

export LINE_CLIENT_ID="LINEのChannel ID"
export LINE_CLIENT_SECRET="LINEのChannel secret"
export LINE_REDIRECT_URI="$PUBLIC_URL/auth/callback/line"
```

その後、バックエンドを起動します。

```bash
cd backend
npm run migrate
npm run generate
npm run dev
```

`BETTER_AUTH_URL`と`LINE_REDIRECT_URI`は、この実装で必須の環境変数です。

### 4.スマホからログインを開始する

PUBLIC_URL+以下のパスにスマホからアクセスする

```
${PUBLIC_URL}auth/line-login-test"
```

重要なのは、ログイン開始からcallbackまでを同じスマホのブラウザーで行うことです。

PCで認証URLを生成して、そのURLだけをスマホへ送ると、`state` Cookieがスマホ側に存在せず、`state_mismatch`になる可能性があります。

### 5.テストユーザーを確認する

LINE Loginチャンネルが`Developing`状態の場合、ログインできるのは次のユーザーだけです。

- Admin
- Tester

また、テストに使うLINEアカウントは、Developer Accountとの紐付けが必要です。

## 成功時の流れ

実機テストが成功すると、次のように処理されます。

```text
スマホのログイン画面
  ↓
POST /auth/sign-in/social
  ↓
LINEのログイン画面
  ↓
/auth/callback/line?code=...&state=...
  ↓
AuthUser / AuthAccount / AuthSessionを作成
  ↓
Session Cookieを発行
  ↓
callbackURLへリダイレクト
```

ログイン後に404が表示されても、必ずしも認証失敗とは限りません。

バックエンドに`/login-complete`の画面が存在しない場合、セッション作成後のリダイレクト先だけが404になっている可能性があります。

その場合は、データベースに次のレコードが作成されているか確認します。

- `AuthUser`
- `AuthAccount`
- `AuthSession`
