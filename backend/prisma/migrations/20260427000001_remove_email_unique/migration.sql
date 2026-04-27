-- Remove unique constraint on User.email to allow multiple users with the same email
-- This enables dependents/family members to share the responsible's email address
DROP INDEX "User_email_key";
