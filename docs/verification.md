# 動作確認手順

## 前提

- Docker Desktop など、Docker Engine と Docker Compose が利用できること
- ホストの `3000` 番ポートが空いていること

## 起動

リポジトリのルートディレクトリで実行します。

```bash
docker compose up -d --build
```

`backend` コンテナでは、起動時に依存パッケージのインストール、データベースマイグレーション、Prisma Client の生成、開発サーバーの起動を行います。起動ログを確認する場合は、以下を実行します。

```bash
docker compose logs -f backend
```

次のログが表示されれば、API の起動が完了しています。

```text
Server is running on http://localhost:3000
```

コンテナの状態は以下でも確認できます。

```bash
docker compose ps
```

## API の動作確認

Swagger UI をブラウザで確認できます。

- Swagger UI: http://localhost:3000/docs

Swagger UI から各 API を実行するか、以下の手順で `curl` を使って確認できます。

### Todo API 一覧

| API                            | HTTP メソッド・パス  | 内容                                                           |
| ------------------------------ | -------------------- | -------------------------------------------------------------- |
| タイトルを指定して Todo を作成 | `POST /todos`        | Todo を新規作成                                                |
| 作成した Todo の一覧を取得     | `GET /todos`         | ユーザー単位で一覧取得、タイトル検索、カーソルページネーション |
| 指定した Todo を変更           | `PUT /todos/{id}`    | Todo のタイトル・ステータス・優先度を更新                      |
| 指定した Todo を削除           | `DELETE /todos/{id}` | Todo を削除                                                    |

### 1. User を作成する

同じメールアドレスの User は複数作成できないため、`<UNIQUE_EMAIL>` を実行ごとに未登録のメールアドレスへ置き換えてください。以降の手順でも同じ値を使って作成した User を特定します。

```bash
curl -i -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "山田 太郎",
    "email": "<UNIQUE_EMAIL>",
    "password": "password"
  }'
```

User 作成が成功すると `204 No Content` が返ります。作成した User の ID は、次の API で確認できます。

```bash
curl http://localhost:3000/users
```

レスポンスから `email` が `<UNIQUE_EMAIL>` と一致する User を探し、その `id` を以降の `<USER_ID>` に置き換えてください。

### 2. タイトルを指定して Todo を作成する API (`POST /todos`)

```bash
curl -i -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "牛乳を買う",
    "userId": "<USER_ID>",
    "status": "PENDING",
    "priority": 5
  }'
```

成功すると `204 No Content` が返ります。

### 3. 作成した Todo の一覧を取得する API (`GET /todos`)

```bash
curl 'http://localhost:3000/todos?userId=<USER_ID>&limit=20'
```

Todo の一覧と、次のページがある場合は `nextCursor` が返ります。次のページを取得する場合は、返された `nextCursor` を指定します。

```bash
curl 'http://localhost:3000/todos?userId=<USER_ID>&limit=20&cursor=<NEXT_CURSOR>'
```

タイトル検索を行う場合は、`title` クエリを追加します。

```bash
curl 'http://localhost:3000/todos?userId=<USER_ID>&title=牛乳'
```

### 4. 指定した Todo を変更する API (`PUT /todos/{id}`)

一覧取得のレスポンスに含まれる Todo の `id` を `<TODO_ID>` に置き換えて実行します。

```bash
curl -i -X PUT http://localhost:3000/todos/<TODO_ID> \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "牛乳とパンを買う",
    "userId": "<USER_ID>",
    "status": "IN_PROGRESS",
    "priority": 8
  }'
```

成功すると `204 No Content` が返ります。

### 5. 指定した Todo を削除する API (`DELETE /todos/{id}`)

```bash
curl -i -X DELETE http://localhost:3000/todos/<TODO_ID>
```

成功すると `204 No Content` が返ります。
