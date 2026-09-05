# ルート構成の整理方針

この文書は、認証・Todo・Userなどの用途別routerを分離し、依存関係を`index.ts`で組み立てたうえで、最後にアプリケーションへ結合する構成へ整理するための方針を記録する。認証routeはこの方針に沿って分離済みであり、Todo/Userを含む全体整理は別の機会に段階的に実施する。

## 背景

現在の `app.ts` は、次の処理を同時に担当している。

- Honoアプリケーション全体の設定
- OpenAPIとエラーハンドリングの設定
- 認証handlerのHTTPルートへの接続
- Todo command/query routeの生成とmount
- User routeの生成とmount
- 各用途のRepository、UseCase、Controllerの依存関係の組み立て

認証routeは`auth/route.ts`で利用するBetter Authのエンドポイントを明示的に分岐し、`app.ts`では`app.route('/auth', createAuthRoute(auth))`で接続する。一方、TodoやUserのrouteも用途単位のsub-applicationを生成しているため、各routerを個別のrouteモジュールとして扱い、`app.ts`では最後に結合する構成へ整理する。

## 目標構成

```text
用途別composition
  ├─ auth/auth.ts
  ├─ todo.composition.ts
  └─ user.composition.ts
          ↓ index.tsで呼び出す
生成済みのController / Handler
          ↓
       app.tsへ注入
          ↓
       用途別routeを結合
          ↓
       Hono app
```

`index.ts`はアプリケーションのcomposition rootとして、Repository、UseCase、Controller、認証Handlerの具体実装を組み立てる。`app.ts`は生成済みの依存を受け取り、用途別routeを作成して結合する。`app.ts`でRepositoryやUseCaseを直接生成しない。

## routeの責務

各routeは、次の責務を持つ。

- 自分の用途に属するHTTP routeを登録する。
- ControllerやUseCaseなどの生成済み依存をfactoryの引数から受け取る。
- 自分の用途に必要なmiddlewareとエラーハンドリングを登録する。
- 他の用途のrouteやBetter Authの具体実装へ直接依存しない。

認証routeでは、`IAuthRequestHandler`を受け取り、Better AuthのhandlerへRequestを転送する。Better Authを生成する処理は `auth/auth.ts` に置き、routeからBetter Authを直接生成しない。

## 用途別composition

用途ごとの`*.composition.ts`は、その用途に必要な依存関係をRepositoryからControllerまで組み立てる。compositionファイル自身はHTTPルートを登録しない。

以下は目標構成を示す擬似コードであり、現在の実装へ直ちに適用するものではない。

```ts
// todo.composition.ts
export const createTodoDependencies = ({ db }: Dependencies) => {
  const repository = new PrismaTodoRepository(db);
  const useCase = new CreateTodoUseCase(repository);
  const controller = new TodoController(useCase);

  return { todoController: controller };
};
```

認証も同じ考え方で、`auth/auth.ts`または認証用compositionでBetter Authと`IAuthRequestHandler`の実装を組み立てる。`index.ts`はそのfactoryを呼び出すだけにする。

## index.tsでの依存関係の組み立て

`index.ts`が各用途のcompositionを呼び出し、生成したControllerやHandlerを`createApp`へ渡す。

```ts
// index.ts
const db = prisma;
const { todoController } = createTodoDependencies({ db });
const { userController } = createUserDependencies({ db });
const auth = createAuth(db);

const app = createApp({
  todoController,
  userController,
  auth,
});
```

依存関係の流れは次のとおりである。

```text
index.ts
  ├─ createTodoDependencies(db)
  │    └─ Repository → UseCase → Controller
  ├─ createUserDependencies(db)
  │    └─ Repository → UseCase → Controller
  ├─ createAuth(prisma)
  │    └─ Better Auth → IAuthRequestHandler
  └─ createApp({ controllers, auth })
```

`index.ts`で具体実装を組み立てることで、`app.ts`は依存関係の生成方法を知らずに済む。将来Repositoryや認証実装を差し替える場合は、該当するcompositionとinfraの変更に閉じ込める。

## app.tsでのroute結合

`app.ts`は、`index.ts`から受け取ったControllerやHandlerを用途別routeへ渡し、routeをmountする。現在の各routeは、TodoやUserの内部routeで`/`を使用し、`app.ts`側でprefixを付けているため、最初は次のようにmount先とrouteを組にして結合する方法が安全である。

```ts
export const createApp = ({
  todoController,
  userController,
  auth,
}: AppDependencies) => {
  const app = new OpenAPIHono();

  const routes = [
    {
      path: '/auth',
      route: createAuthRoute(auth),
    },
    {
      path: '/todos',
      route: createTodoRoute(todoController),
    },
    {
      path: '/users',
      route: createUserRoute(userController),
    },
  ] as const;

  routes.forEach(({ path, route }) => {
    app.route(path, route);
  });

  return app;
};
```

将来的に各route自身が完全なパスを持つ構成へ変更する場合は、`app.route('/', route)`で一律に結合できる。その場合は、OpenAPI定義のpath、既存テストのURL、Better Authの`basePath`を同時に確認する。

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
  └─ createApp({ controllers, auth })

auth/auth.ts
  ├─ createBetterAuth(database)
  └─ BetterAuthHandlerを生成

app.ts
  ├─ 受け取ったController / Handlerをrouteへ渡す
  └─ 生成されたrouteをmountする
```

`app.ts`はBetter Authの設定、Prisma adapter、Repository、UseCase、Controllerを生成しない。依存関係は`index.ts`と用途別compositionで解決し、`app.ts`は受け取った依存をrouteへ渡して結合する。

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

この形を採用する場合、`app.ts`では`createAuthRoute(auth)`を他のrouteと同じように結合する。routeを直接`app.ts`へ書く構成へ戻す必要はない。

## 実施時の確認事項

別の機会に整理するときは、次を確認する。

- 既存の`/auth`、`/todos`、`/users`のURLが変わらないこと。
- Better Authの`basePath`と認証routeのmount pathが一致していること。
- 認証routeがGET/POST以外をBetter Authへ転送しないこと。
- Repository、UseCase、Controllerが`index.ts`または用途別compositionで生成され、`app.ts`で生成されていないこと。
- OpenAPIのpathと実際のrouteが一致していること。
- routeの結合順によってcatch-allやエラーハンドリングが変わらないこと。
- 既存のcommand/queryと認証の統合テストが通ること。
- フロントエンドとバックエンドが別Originになる場合、CORSとtrustedOriginsを別途設定すること。
