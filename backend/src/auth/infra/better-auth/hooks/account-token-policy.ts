// accountのcreate/update before hookとして登録し、DBへ保存される前に
// provider tokenをnullへ置き換える。after hookでは保存後に別UPDATEが必要になり、
// tokenを一度保存する可能性があるため、保存前に除去する。
const ACCOUNT_TOKEN_FIELDS = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
} as const;

export const clearAccountTokenFields = () =>
  Promise.resolve({ data: ACCOUNT_TOKEN_FIELDS });
