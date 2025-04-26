ALTER TABLE "reading_modules" DROP CONSTRAINT "reading_modules_admin_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_modules" ALTER COLUMN "type" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "reading_modules" ALTER COLUMN "genre" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "reading_modules" ALTER COLUMN "language" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "reading_modules" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_modules" ALTER COLUMN "image_url" SET DATA TYPE varchar(2048);--> statement-breakpoint
ALTER TABLE "reading_modules" ADD COLUMN "author_first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "reading_modules" ADD COLUMN "author_last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "reading_modules" ADD CONSTRAINT "reading_modules_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;