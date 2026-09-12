// Better Auth 1.7.2 requires an email during the OAuth callback, even when the
// provider does not request one. The LINE provider supplies this transient
// value so the callback can continue, and this hook removes it before insert.
const LINE_PLACEHOLDER_EMAIL_PATTERN = /^line-.+@example\.invalid$/;

export const clearLinePlaceholderEmail = (user: { email?: string }) => {
  if (!user.email || !LINE_PLACEHOLDER_EMAIL_PATTERN.test(user.email)) {
    return Promise.resolve();
  }

  return Promise.resolve({
    data: { email: null } as unknown as { email?: string },
  });
};
