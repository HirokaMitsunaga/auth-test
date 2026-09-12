-- AuthUser.email is optional because LINE Login does not request an email address.
ALTER TABLE "AuthUser" ALTER COLUMN "email" DROP NOT NULL;
