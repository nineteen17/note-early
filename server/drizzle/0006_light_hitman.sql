CREATE TYPE "public"."language" AS ENUM('UK', 'US');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reading_level" integer;--> statement-breakpoint
ALTER TABLE "reading_modules" ADD COLUMN "language" "language" NOT NULL;