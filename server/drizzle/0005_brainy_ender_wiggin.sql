CREATE TYPE "public"."genre" AS ENUM('History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom');--> statement-breakpoint
ALTER TABLE "reading_modules" ADD COLUMN "genre" "genre" NOT NULL;--> statement-breakpoint
ALTER TABLE "paragraph_submissions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "paragraph_submissions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_paragraph_idx" ON "paragraph_submissions" USING btree ("student_progress_id","paragraph_index");