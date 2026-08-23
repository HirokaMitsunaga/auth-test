## 結論

設計の骨格は良いです。state・PKCE・nonce・固定 redirect_uri・メール自動紐付け禁
止・セッションTokenのハッシュ保存は適切です。

ただし、このまま実装仕様として使うと、ログイン不能・初回ログイン競合・CSRF・ID
トークン検証不備が起きます。優先度順に以下です。

### Blocker / High

1. \_\_Host-auth-flow Cookieの定義が不完全

backend/src/auth/README.md:81 と backend/src/auth/README.md:196 では Secure 等し
か指定していません。

\_\_Host- Cookieには必ず以下が必要です。

Path=/
Secure
Domainなし

Path=/
がないと、ブラウザにCookieを拒否され、コールバック時に常にログイン試行が見つから
なくなります。Cookie仕様
(https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/)

2. SameSite が「適切」としか書かれていない

LINE/GoogleからのクロスサイトなトップレベルGETでコールバックされるため、SameSite
=Strict
ではCookieが送信されずログインに失敗します。今回のGETフローでは少なくとも
SameSite=Lax を明記すべきです。Cookie仕様
(https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/)

3. トークン交換に client_secret がない

backend/src/auth/README.md:114 と backend/src/auth/README.md:141 の交換パラメー
タに client_secret がありません。

LINE Login v2.1の認可コード交換では、Webアプリの場合 client_secret
が必要です。LINE Login API reference
(https://developers.line.biz/en/reference/line-login/)。PKCEはこの代替ではありません。サーバー側の秘密情報管理と、プロバイダーごとのクライアント認証方式を明記してください。

4. IDトークン検証条件が実装者任せ

backend/src/auth/README.md:316 以降では「署名が正しい」とありますが、次が未定義
です。

- 許可する署名アルゴリズム。none を拒否すること
- JWKS取得元、kid、鍵ローテーション
- aud が文字列・配列の場合の処理
- 複数audience時の azp
- iss の完全一致
- exp、iat、nbf の許容時計ずれ
- sub の形式・最大長

OIDCでは iss、sub、aud、nonce の検証が重要で、aud は配列になり得ます。OpenID
Connect Core 1.0 (https://openid.net/specs/openid-connect-core-1_0-final.html)

5. 初回ログインの競合処理がない

backend/src/auth/README.md:276 は検索後に未登録なら作成する流れですが、同一ユー
ザーのコールバックが並行すると、両方が「未登録」と判断します。

DBの一意制約だけでは不十分です。片方の UNIQUE 制約違反を捕捉し、既存の
AuthIdentity を再取得してログイン継続する処理が必要です。

6. ログイン後の一般CSRF対策がない

state はOAuthコールバックのCSRF対策であり、ログイン後のAPI操作のCSRF対策ではあり
ません。backend/src/auth/README.md:294 のCookieセッションでTodo等を操作するな
ら、Origin検証、CSRFトークン、Fetch Metadata、CORS方針などを別途定義すべきです。

### Medium

7. 1ブラウザ1Cookieのため、複数タブログインに失敗する

backend/src/auth/README.md:81 の固定Cookieに1つの attemptId しか持たせないため、
タブAでログイン開始後、タブBで開始するとタブAのCookieが上書きされます。複数タ
ブ・複数プロバイダーを許容するか、ログイン試行を複数保持する仕組みを決める必要が
あります。

8. redirect_uri を保存しない前提が危険

backend/src/auth/README.md:83 と backend/src/auth/README.md:207 は設定から再計算
する設計ですが、デプロイ中の設定変更・複数インスタンス間の設定差異で開始時と交換
時の値が変わります。

設定を不変にするか、ログイン試行に providerConfigVersion などを保存して同じ設定
スナップショットを使うべきです。

9. プロバイダーの拒否・エラー応答の分岐がない

コールバックには code ではなく error=access_denied が返る場合があります。現在の
シーケンス図は常にコード交換へ進むように見えます。error、state 欠落、重複パラ
メータ、期限切れを明示的に処理してください。

併せて、コールバックのクエリをアクセスログ・プロキシログへ出さない、Cache-
Control: no-store を付ける、処理後にURLから認可コードを除去する方針も必要です。

10. 暗号化仕様が不足している

AEAD とだけ書かれており、以下が未定義です。

- アルゴリズム
- nonce/IVの生成と再利用防止
- AADに含める値
- 鍵の用途分離
- 鍵バージョンとローテーション
- 復号失敗時の扱い

PKCEの code_verifier
も、最低43文字・最大128文字、十分なエントロピーを明記した方が安全です。RFC 7636
(https://www.rfc-editor.org/rfc/rfc7636.html)

11. 現行スキーマとREADMEが一致していない

READMEは UserAccount、パスワードなし、nullableなemailを想定していますが、現行の
backend/prisma/schema.prisma:22 は User、必須の email、必須の password です。
Todo も User を参照しています。

READMEを「提案設計」と明記し、既存 User を移行するのか、UserAccount に改名するの
か、Todoの外部キーをどう移すのかを決める必要があります。

## 最優先の修正

1. Cookie属性を完全に固定する
2. client_secret とプロバイダー設定スナップショットを定義する
3. IDトークン検証条件を具体化する
4. 初回登録の競合リトライを定義する
5. 一般APIのCSRF方針を追加する
6. 現行Prismaスキーマとの移行方針を追加する

ファイルの変更は行っていません。検証はREADME、Prismaスキーマ、依存設定、認証実装
ファイルの有無、およびOAuth/OIDC公式仕様との照合です。
