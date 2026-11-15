CREATE TABLE "user_appearance" (
	"user_id" text PRIMARY KEY,
	"preferences" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_appearance" ADD CONSTRAINT "user_appearance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;