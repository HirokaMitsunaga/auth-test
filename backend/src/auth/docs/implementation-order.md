# Better Auth 実装順序

## 目的

Better Auth を使った認証を、責務ごとに分割して実装するための順番を定義する。
設計の詳細とセキュリティ要件は better-auth.md に記載し、この文書では実装単位、完了条件、依存関係を扱う。

各単位は、原則として一つのコミットまたは小さな PR として完了させる。途中の単位でも型チェックと関連テストが通る状態を維持する。

## 前提

- 認証のプロトコル処理は Better Auth に委譲する。auth/domain は作らないが、アプリケーション固有の処理をオーケストレーションする auth/usecase は作成する。
- auth の port にはアプリケーションが必要とする IF と DTO だけを定義し、Prisma や Better Auth の型を公開しない。
- Better Auth と Prisma の接続、スキーマ、フックは infra/better-auth に閉じ込める。
- route、controller、usecase は具体的な認証実装に依存しない。依存性の注入と実装の組み立ては src/index.ts を composition root として行う。composition 専用ディレクトリは作成しない。
- 今回は認証だけを扱う。LINE/Google のアクセストークンを使ったプロバイダー API 呼び出し（認可）は実装しない。
- Better Auth のバージョンと Prisma アダプターの API は、実装開始時に固定して確認する。公式ドキュメントの生成手順や現在の API と差分がある場合は、採用するバージョンの仕様を優先する。
- 既存の User テーブルは変更しない。Better Auth の論理モデル user は物理テーブル AuthUser として分離し、Todo との接続は認証ユーザー連携の単位で移行方法を決める。

## 全体の順番

| 順番 | 実装単位 | 主な成果物 | 完了条件 |
| --- | --- | --- | --- |
| 1 | 最小構成の疎通とバージョン固定 | Better Auth の最小設定、バージョン方針 | 認証インスタンスを起動でき、採用バージョンとアダプター API が確定している |
| 2 | 認証スキーマと DB マイグレーション | AuthUser / AuthAccount / AuthSession / AuthVerification | 既存 User/Todo を変更せず、空の DB と既存 DB の両方でスキーマを適用できる |
| 3 | auth の port・infra・usecase・controller の骨格 | port、Better Auth アダプター、usecase、HTTP ルート | DB 依存を port/usecase/controller に漏らさず、認証処理とセッション取得まで動作する |
| 4 | Cookie とトークンのセキュリティポリシー | Cookie 固定、account トークンポリシー | 属性と保存禁止項目をテストで固定できている |
| 5 | LINE のログインを縦に実装 | LINE 設定、コールバック、関連テスト | 初回ログイン、再ログイン、ログアウトが動作する |
| 6 | Todo への認証ユーザー連携 | 認証ミドルウェア、command/query の利用変更 | リクエスト由来の userId に依存せず、セッションユーザーで認可できる |
| 7 | 初回ログインの競合処理 | 一意制約、競合時の再取得またはリトライ、統合テスト | 同一ユーザーの並行コールバックが重複作成にならず、両方がログインを継続できる |
| 8 | Google のログインを追加 | Google 設定、関連テスト | LINE と同じ共通フローと検証条件を満たす |
| 9 | 旧認証処理の整理と運用準備 | 不要な password 処理の削除、移行・運用手順 | 旧経路が残らず、デプロイ・ロールバック方針が確定している |

## 1. 最小構成の疎通とバージョン固定

最初に実際に採用する Better Auth のバージョンを決め、最小構成で起動する。ここでは LINE/Google の実ログインやアプリケーションの認可処理まで実装しない。

実施内容:

- backend の依存関係に Better Auth と採用するデータベースアダプターを追加する。
- Better Auth のバージョンを lockfile と合わせて固定する。
- secret、base URL、trusted origins、データベース接続先など、設定値の名前と取得方法を決める。
- Better Auth のインスタンスを生成し、HTTP ハンドラーを最小のルートに接続する。
- 採用バージョンでスキーマ生成、Prisma アダプター、Hono の Request/Response 連携が動くことを確認する。

完了条件:

- backend が起動する。
- 認証ハンドラーに到達できる。
- 採用バージョン、アダプターの import、スキーマ生成・マイグレーション方法が README に反映されている。
- 未確定の API を前提に後続実装を始めない。

## 2. 認証スキーマと DB マイグレーション

最小構成で確認したスキーマを Prisma schema に反映し、データベース変更を先に確定する。Better Auth が標準で利用する論理テーブルは次の 4 つであり、物理テーブル名には Auth プレフィックスを付ける。

- AuthUser: Better Auth の user
- AuthAccount: LINE/Google などの外部プロバイダーとの紐付け
- AuthSession: ログインセッション
- AuthVerification: 認証フローで使う一時的な検証情報

実施内容:

- Better Auth のスキーマ生成結果を採用バージョンに合わせて取り込む。
- Better Auth の modelName を AuthUser、AuthAccount、AuthSession、AuthVerification に固定する。
- 既存 User テーブルと Todo は変更せず、AuthUser と Todo の接続方法は Unit 6 の移行設計へ分離する。
- account の accessToken、refreshToken、idToken は今回の認証では利用しないため、保存しない方針をスキーマ・フック・テストで確認できるようにする。
- 空の DB に適用するマイグレーションと、既存 DB に適用するデータ移行を分けて確認する。

完了条件:

- Prisma Client を生成できる。
- 空の DB へマイグレーションを適用できる。
- 既存 User/Todo データを変更せずに適用できる。
- AuthUser、AuthAccount、AuthSession、AuthVerification の制約とインデックスが設計書と一致している。

## 3. auth の port・infra・usecase・controller の骨格

DB や Better Auth への依存を閉じ込めるため、先に境界を作る。auth は外部認証機能の利用であり、このシステム固有の業務 domain ではないため、auth/domain は作らない。

作成する責務:

- port/auth-handler.interface.ts: 認証 HTTP ハンドラーの IF
- port/auth-session-reader.interface.ts: 現在のセッションから AuthenticatedUser を取得する IF
- usecase/handle-auth.use-case.ts: 認証 HTTP 要求のオーケストレーションとアプリケーション固有の前後処理
- usecase/get-authenticated-user.use-case.ts: セッション取得とアプリケーション固有の認証条件の適用
- controller/http/auth.route.ts: 認証ルートの定義
- controller/http/auth.controller.ts: usecase の呼び出しと HTTP 入出力の変換
- controller/http/require-authenticated-user.middleware.ts: GetAuthenticatedUserUseCase 経由で認証済みユーザーを要求するミドルウェア
- infra/better-auth/better-auth-config.ts: Better Auth の設定と Prisma アダプターの組み立て
- infra/better-auth/better-auth-handler.ts: Better Auth の auth.handler を port に適合させる実装
- infra/better-auth/better-auth-session-reader.ts: auth.api.getSession の結果を port の DTO に変換する実装

src/index.ts で、次のように実装を組み立てる。

    const auth = createBetterAuth(...)
    const authHandler = new BetterAuthHandler(auth)
    const sessionReader = new BetterAuthSessionReader(auth)
    const authUseCase = new HandleAuthUseCase(authHandler)
    const authenticatedUserUseCase =
      new GetAuthenticatedUserUseCase(sessionReader)
    const authController = new AuthController(authUseCase)
    return createApp({
      db,
      authController,
      authenticatedUserUseCase,
    })

実際の関数名は採用する実装に合わせるが、設定、変換、usecase、HTTP ルート、controller、ミドルウェアの責務は分離する。auth.ts に認証フロー全体を詰め込まない。usecase は Better Auth の型や Prisma の型を直接参照せず、port だけに依存する。

完了条件:

- port が Prisma または Better Auth の型を import していない。
- usecase が Prisma または Better Auth の型を import していない。
- 認証ハンドラーとセッション取得の実装が infra/better-auth にある。
- 未認証リクエストは 401 になり、認証済みリクエストでは port の AuthenticatedUser を取得できる。
- app.ts が Better Auth の設定や infra を直接 import せず、生成済みの controller/usecase を受け取っている。
- auth のルートを既存 app に登録しても、既存 command/query のテストが壊れない。

## 4. Cookie とトークンのセキュリティポリシー

プロバイダーを追加する前に、ブラウザーへ返す Cookie と DB へ保存するトークンの扱いを固定する。プロバイダーごとに挙動が揺れる状態で LINE/Google を実装しない。

実施内容:

- Cookie の name、httpOnly、secure、sameSite、path、domain、maxAge/expires を環境ごとに明示する。
- 本番で secure が無効にならないこと、意図しない domain や path を使わないことを確認する。
- account 作成・更新時の hook で accessToken、refreshToken、idToken を保存対象から除外する。
- 今回は認証用途だけなので、ログイン後に provider API を呼び出す認可機能やトークン更新処理は作らない。
- provider 設定のスナップショット、issuer、client_id、redirect URI など、ID トークン検証に必要な値を実行時に一貫して参照できる形にする。
- secret、認証 Cookie、ID トークン、プロバイダーのクライアントシークレットをログへ出力しない。

完了条件:

- Set-Cookie の全属性をテストで検査できる。
- account に 3 種類のトークンが保存されないことを確認できる。
- origin、redirect URI、provider allowlist の拒否条件を確認できる。
- ID トークンについて issuer、audience、signature、nonce、exp/iat など採用する検証条件が明文化されている。

## 5. LINE のログインを縦に実装

最初のプロバイダーとして LINE だけを有効化し、開始からコールバック、ユーザー・アカウント・セッション作成までを一つの縦スライスで実装する。Google は共通部分が安定してから追加する。

実施内容:

- LINE の client_id、client_secret、issuer、redirect URI を環境設定から取得する。
- 認証開始、state/nonce、コールバック、エラー時の戻り先を実装する。
- ID トークンの issuer、audience、署名、nonce、有効期限、必須 subject を検証する。
- account の providerId と外部 subject を使って既存ユーザーを特定する。
- email の一致だけで既存ユーザーへ暗黙リンクしない。リンクは明示操作がある場合だけに限定する。
- 外部プロバイダーを直接呼ばないテスト用の認証結果を用意し、統合テストを安定させる。

完了条件:

- 初回ログインで user、account、session が 1 件ずつ作成される。
- 2 回目以降は既存 account からログインできる。
- 不正な state/nonce、issuer、audience、署名、期限の ID トークンを拒否できる。
- ログアウト後に保護された API が 401 になる。

## 6. Todo への認証ユーザー連携

認証が単独で動いた後、既存 Todo の入口へ認証ユーザーを接続する。認証の実装を Todo の domain に混ぜず、controller のミドルウェアと既存 usecase の入力境界で連携する。

実施内容:

- Todo の保護ルートへ require-authenticated-user.middleware.ts を適用する。
- セッションから得た Better Auth user.id を Todo の userId として usecase へ渡す。
- リクエストボディや URL パラメーターの userId を所有者判定に使わない。
- 一覧、取得、更新、削除の全操作で userId による所有者条件を適用する。
- 既存の command の controller/usecase/infra の構造を維持する。

完了条件:

- 未認証では Todo API を実行できない。
- ユーザー A がユーザー B の Todo を取得・更新・削除できない。
- 既存の Todo テストに認証コンテキストを追加し、既存機能の回帰がない。

## 7. 初回ログインの競合処理

同じユーザーのコールバックが並行する場合に備え、実際の DB 制約を使った統合テストを追加する。たとえば、ユーザーがコールバック画面を二重送信した場合、ブラウザーの再送、モバイル回線の再試行、複数タブ、ロードバランサー配下の同時リクエストなどで発生する。

処理の方針:

1. issuer と provider の subject をキーに既存 account を検索する。
2. 未登録なら user、account、session の作成を試みる。
3. 並行リクエストが先に作成した場合、後続リクエストの UNIQUE 制約違反を認証失敗として返さない。
4. 競合が対象キーの一意制約違反であることを確認する。
5. 既存 account を再取得し、その user に対するログイン処理を継続する。必要な場合だけ、Better Auth のトランザクションまたは明示的なリトライ方針に合わせる。
6. 外部キー違反や接続エラーなど、競合以外の DB エラーは握りつぶさず失敗させる。

完了条件:

- 同じ issuer/subject のコールバックを同時に 2 件実行する統合テストがある。
- user と account が重複作成されない。
- 並行した両方のリクエストがセッション発行まで継続できる、または採用する Better Auth の仕様に沿った明確な再試行結果になる。
- 競合以外の一意制約違反や DB エラーを誤って成功扱いしない。

## 8. Google のログインを追加

LINE で共通フローと競合処理を検証した後、Google を追加する。プロバイダー固有の設定以外は LINE の実装を複製せず、Better Auth の共通経路を利用する。

実施内容:

- Google の client_id、client_secret、issuer、redirect URI を設定する。
- Google の discovery/JWKS と ID トークン検証条件を採用バージョンの仕様に合わせる。
- LINE と同じ Cookie、アカウントトークン保存禁止、暗黙リンク禁止のポリシーを適用する。
- 成功、再ログイン、キャンセル、不正トークン、競合のテストを追加する。

完了条件:

- LINE と Google が同じ session reader と認証済みユーザーの扱いを利用する。
- provider ごとに issuer、audience、redirect URI が混同されない。
- Google 追加によって LINE や Todo の認証認可テストが壊れない。

## 9. 旧認証処理の整理と運用準備

新しい認証経路と Todo の連携が安定した後に、旧 User/password 処理を整理する。先に削除すると移行失敗時の切り戻しが難しくなるため、最後に行う。

実施内容:

- 旧ログイン、password 保存、不要な User repository/API を検索して削除または明示的に非推奨化する。
- Better Auth user と Todo.userId の移行結果を確認する。
- 本番用 secret、provider client_secret、Cookie 設定の投入方法を決める。
- マイグレーションの適用、ロールバック、失敗時の再実行、監視ログの手順を文書化する。
- 実プロバイダーを使う E2E は、テスト用クライアントと固定された redirect URI を使って実施する。

完了条件:

- 旧認証経路へ到達できない。
- 本番設定に secret や client_secret がハードコードされていない。
- 型チェック、Lint、単体テスト、認証統合テスト、Todo 回帰テストが通る。
- デプロイ後にログイン、保護 API、ログアウト、再ログインを確認する手順がある。

## 各実装単位での検証ルール

各単位の完了時に、変更範囲に応じて次を実施する。

- TypeScript の型チェック
- ESLint
- 変更した機能の統合テスト
- 既存の command/query の回帰テスト
- 差分レビュー（不要な auth/domain、auth/composition 専用ディレクトリ、Prisma/Better Auth 型の port・usecase・controller への流出がないこと）

プロバイダーの実アカウントや外部ネットワークが必要な確認は、通常の CI テストと分ける。CI では認証結果のテストダブルを使い、ステージングで実プロバイダーの E2E を実施する。

## 参照

- [Better Auth Installation](https://better-auth.com/docs/installation)
- [Better Auth Database](https://better-auth.com/docs/concepts/database)
- [Better Auth Hono integration](https://better-auth.com/docs/integrations/hono)
- [Better Auth LINE authentication](https://better-auth.com/docs/authentication/line)
- [Better Auth Google authentication](https://better-auth.com/docs/authentication/google)
