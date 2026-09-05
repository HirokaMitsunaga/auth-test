# ルート構成の整理方針

この文書は、認証・Todo・Userなどの用途別routerを分離し、依存関係を`index.ts`で組み立てたうえで、最後にアプリケーションへ結合する構成を記録する。

## 背景

`app.ts`は、次の処理だけを担当する。

- Honoアプリケーション全体の設定
- OpenAPIとエラーハンドリングの設定
- `index.ts`から受け取った用途別routeのmount

認証routeは`auth/route.ts`で利用するBetter Authのエンドポイントを明示的に分岐する。TodoとUserのrouteも用途単位のsub-applicationとして生成し、`app.ts`では各routeを最後に結合する。

## 目標構成

```text
用途別composition
  ├─ auth/auth.ts
  ├─ todo.composition.ts
  └─ user.composition.ts
          ↓ index.tsで呼び出す
生成済みのUseCase / Handler / route
          ↓
       app.tsへ注入
          ↓
       用途別routeを結合
          ↓
       Hono app
```

`index.ts`はアプリケーションのcomposition rootとして、Repository、UseCase、認証Handler、HTTP routeの具体実装を組み立てる。`app.ts`は生成済みのrouteを受け取り、公開prefixへ結合する。`app.ts`でRepositoryやUseCaseを直接生成しない。

## routeの責務

各routeは、次の責務を持つ。

- 自分の用途に属するHTTP routeを登録する。
- UseCaseなどの生成済み依存をfactoryの引数から受け取る。
- 自分の用途に必要なmiddlewareとエラーハンドリングを登録する。
- 他の用途のrouteやBetter Authの具体実装へ直接依存しない。

認証routeでは、`IAuthRequestHandler`を受け取り、Better AuthのhandlerへRequestを転送する。Better Authを生成する処理は `auth/auth.ts` に置き、routeからBetter Authを直接生成しない。

## 用途別composition

用途ごとの`*.composition.ts`は、その用途に必要なRepositoryとUseCaseを組み立てる。HTTP routeの登録は、各用途のroute factoryを`index.ts`から呼び出して行う。compositionファイル自身はHTTPルートを登録しない。

現在の実装は次の構成である。

```ts
// todo.composition.ts
export const createTodoDependencies = ({ db }: { db: Database }) => {
  const todoRepository = new TodoRepositoryPrisma(db);
  const userRepository = new UserRepositoryPrisma(db);
  const todoQueryService = new TodoQueryServicePrisma(db);

  return {
    todoCommand: {
      createTodoUseCase: new CreateTodoUseCase(
        todoRepository,
        userRepository,
      ),
      updateTodoUseCase: new UpdateTodoUseCase(
        todoRepository,
        userRepository,
      ),
      deleteTodoUseCase: new DeleteTodoUseCase(todoRepository),
    },
    todoQuery: {
      readTodoUseCase: new ReadTodoUseCase(todoQueryService),
    },
  };
};
```

認証は`auth/auth.ts`でBetter Authと`IAuthRequestHandler`の実装を組み立て、`auth/route.ts`でHTTP routeを生成する。`index.ts`はそれぞれのfactoryを呼び出して完成済みrouteを`createApp`へ渡す。

## index.tsでの依存関係の組み立て

`index.ts`が各用途のcompositionを呼び出し、UseCaseをHTTP routeへ注入してから、完成したrouteを`createApp`へ渡す。

```ts
// index.ts
const todoDependencies = createTodoDependencies({ db: prisma });
const userDependencies = createUserDependencies({ db: prisma });

const app = createApp({
  authRoute: createAuthRoute(createAuth(prisma)),
  todoCommandRoute: createTodoCommandRoute(todoDependencies.todoCommand),
  todoQueryRoute: createTodoQueryRoute(todoDependencies.todoQuery),
  userCommandRoute: createUserCommandRoute(userDependencies.user),
});
```

依存関係の流れは次のとおりである。

```text
index.ts
  ├─ createTodoDependencies(db)
  │    ├─ Repository → Command UseCase
  │    └─ Query Service → Query UseCase
  ├─ createUserDependencies(db)
  │    └─ Repository → UseCase
  ├─ createAuth(prisma)
  │    └─ Better Auth → IAuthRequestHandler
  ├─ route factoryへUseCase / Handlerを注入
  └─ createApp({ routes })
```

`index.ts`で具体実装を組み立てることで、`app.ts`は依存関係の生成方法を知らずに済む。将来Repositoryや認証実装を差し替える場合は、該当するcompositionとinfraの変更に閉じ込める。

## app.tsでのroute結合

`app.ts`は、`index.ts`から受け取った完成済みrouteをmountする。TodoとUserの内部routeは`/`を使用し、`app.ts`側でprefixを付ける。認証routeも同じように`/auth`へmountする。

```ts
export const createApp = ({
  authRoute,
  todoCommandRoute,
  todoQueryRoute,
  userCommandRoute,
}: AppRoutes) => {
  const app = new OpenAPIHono();

  app.route('/auth', authRoute);
  app.route('/todos', todoCommandRoute);
  app.route('/todos', todoQueryRoute);
  app.route('/users', userCommandRoute);

  return app;
};
```

公開URLを変更する場合は、`app.route`のmount先、OpenAPI定義のpath、既存テストのURL、Better Authの`basePath`を同時に確認する。

## パスに関する方針

Hono公式のBetter Auth例では、サンプルの構成に合わせて`/api`をbase pathとしている。このシステムでは既存の公開パスを維持するため、現時点では`/api`を追加しない。

```text
/auth/sign-in/social
/auth/callback/line
/todos/*
/users/*
```

認証routeはBetter Authの`basePath: '/auth'`と一致させ、利用するパスとHTTPメソッドだけをhandlerへ渡す。定義していない認証パスは転送しない。

## 依存性の扱い

依存性の組み立ては次のように分ける。

```text
index.ts
  ├─ prismaを取得
  ├─ 用途別compositionを呼び出す
  ├─ UseCase / Handlerをrouteへ注入
  └─ createApp({ routes })

auth/auth.ts
  ├─ createBetterAuth(database)
  └─ BetterAuthHandlerを生成

app.ts
  └─ 受け取ったrouteをmountする
```

`app.ts`はBetter Authの設定、Prisma adapter、Repository、UseCase、HTTP routeを生成しない。依存関係とrouteの生成は`index.ts`で解決し、`app.ts`は受け取ったrouteを結合する。

## `createAuthRoute`の扱い

routeを用途ごとに分離する構成では、`createAuthRoute`は認証用routerを生成するfactoryとして意味を持つ。単なるhandler転送だけであっても、認証routeを他のrouteと分離し、`IAuthRequestHandler`を注入できる境界になるためである。

`app.route('/auth', route)` でmount先を外側から指定し、router内部ではBetter AuthのbasePathを除いた相対pathを明示する。wildcardを使用しないため、公開するエンドポイントをコード上で確認できる。

```ts
export const createAuthRoute = (auth: IAuthRequestHandler) => {
  const router = new Hono();

  router.post('/sign-in/social', (c) => auth.handle(c.req.raw));
  router.on(['GET', 'POST'], '/callback/line', (c) =>
    auth.handle(c.req.raw),
  );

  return router;
};
```

`createAuthRoute`は`index.ts`で生成し、`app.ts`へ完成済みの`authRoute`として渡す。routeの具体的な依存関係を`app.ts`で組み立てない。

## 実施時の確認事項

変更時は、次を確認する。

- 既存の`/auth`、`/todos`、`/users`のURLが変わらないこと。
- Better Authの`basePath`と認証routeのmount pathが一致していること。
- 認証routeがGET/POST以外をBetter Authへ転送しないこと。
- RepositoryとUseCaseが`index.ts`または用途別compositionで生成され、`app.ts`で生成されていないこと。
- OpenAPIのpathと実際のrouteが一致していること。
- routeの結合順によってcatch-allやエラーハンドリングが変わらないこと。
- 既存のcommand/queryと認証の統合テストが通ること。
- フロントエンドとバックエンドが別Originになる場合、CORSとtrustedOriginsを別途設定すること。
