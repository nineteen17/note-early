CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'home', 'pro');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('free', 'active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'STUDENT', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."module_type" AS ENUM('curated', 'custom');--> statement-breakpoint
CREATE TABLE "customer_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"full_name" varchar(100),
	"email" varchar(255),
	"avatar_url" text,
	"stripe_customer_id" varchar(255),
	"subscription_status" "subscription_status" DEFAULT 'free',
	"subscription_plan" "subscription_plan" DEFAULT 'free',
	"subscription_renewal_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"pin" text,
	"admin_id" uuid,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "reading_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"level" integer NOT NULL,
	"type" "module_type" NOT NULL,
	"admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"description" text,
	"image_url" text,
	"estimated_reading_time" integer
);
--> statement-breakpoint
CREATE TABLE "student_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"summary_text" text,
	"score" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"time_spent_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"teacher_feedback" text,
	"teacher_feedback_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric NOT NULL,
	"interval" text NOT NULL,
	"tier" "subscription_plan" NOT NULL,
	"student_limit" integer NOT NULL,
	"module_limit" integer NOT NULL,
	"custom_module_limit" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"payment_method" text,
	"receipt_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_modules" ADD CONSTRAINT "reading_modules_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_module_id_reading_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."reading_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_subscription_id_customer_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."customer_subscriptions"("id") ON DELETE no action ON UPDATE no action;