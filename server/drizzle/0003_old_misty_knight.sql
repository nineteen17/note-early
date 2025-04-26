CREATE TABLE "paragraph_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_progress_id" uuid NOT NULL,
	"paragraph_index" integer NOT NULL,
	"paragraph_summary" text NOT NULL,
	"cumulative_summary" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reading_modules" RENAME COLUMN "content" TO "structured_content";
--> statement-breakpoint
-- Manually added type change with USING clause
ALTER TABLE "reading_modules" ALTER COLUMN "structured_content" SET DATA TYPE jsonb USING "structured_content"::jsonb;
--> statement-breakpoint
-- Changed RENAME to DROP for the old text column
ALTER TABLE "student_progress" DROP COLUMN "summary_text";
--> statement-breakpoint
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_student_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_module_id_reading_modules_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_modules" ADD COLUMN "paragraph_count" integer NOT NULL;
--> statement-breakpoint
-- Manually added the new integer column
ALTER TABLE "student_progress" ADD COLUMN "highest_paragraph_index_reached" integer;
--> statement-breakpoint
ALTER TABLE "student_progress" ADD COLUMN "final_summary" text;
--> statement-breakpoint
ALTER TABLE "paragraph_submissions" ADD CONSTRAINT "paragraph_submissions_student_progress_id_student_progress_id_fk" FOREIGN KEY ("student_progress_id") REFERENCES "public"."student_progress"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_module_id_reading_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."reading_modules"("id") ON DELETE cascade ON UPDATE no action;