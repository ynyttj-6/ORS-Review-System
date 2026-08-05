-- Add an application-owned login account independent of Supabase's internal email identifier.
ALTER TABLE "users" ADD COLUMN "login_name" VARCHAR(100);

-- Existing users keep their current email as their login account for backward compatibility.
UPDATE "users" SET "login_name" = LOWER("email");

ALTER TABLE "users" ALTER COLUMN "login_name" SET NOT NULL;
CREATE UNIQUE INDEX "users_login_name_key" ON "users"("login_name");
