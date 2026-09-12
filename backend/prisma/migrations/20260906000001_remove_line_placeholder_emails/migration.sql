-- Remove placeholder values created by the previous LINE login test flow.
UPDATE "AuthUser"
SET "email" = NULL
WHERE "email" LIKE 'line-%@example.invalid';
